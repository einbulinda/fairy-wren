const pool = require("../../../config/db");
const receiptsRepo = require("../repos/inventory.receipts.repository");
const restockService = require("../repos/inventory.adjustments.repository");
const ledgerRepo = require("../repos/inventory.ledger.repository");
const auditRepo = require("../../audit/audit.repository");
const journalRepo = require("../../journals/journals.repository");
const accountsRepo = require("../../accounts/accounts.repository");
const supplierPaymentsRepo = require("../../suppliers/suppliers.repository");

exports.getReceiptDetail = async (id) => {
  const { data, error } = await receiptsRepo.getReceiptById(id);
  if (error) throw error;
  return data;
};

exports.markReceiptPaid = async (id, payload, context) => {
  // Validate required fields
  if (!payload.payment_method) throw new Error("PAYMENT_METHOD_REQUIRED");
  if (!payload.reference) throw new Error("REFERENCE_REQUIRED");

  // Get receipt to know the amount and supplier
  const { data: receipt, error: receiptErr } =
    await receiptsRepo.getReceiptById(id);
  if (receiptErr || !receipt) throw new Error("RECEIPT_NOT_FOUND");
  if (receipt.paid_at) throw new Error("RECEIPT_ALREADY_PAID");

  const amount = Number(payload.amount || receipt.total_amount);

  // Determine which account to credit (cash, specific bank, or default bank 1020)
  let creditAccount;
  if (payload.payment_method === "cash") {
    const { data } = await accountsRepo.findByCode("1010");
    creditAccount = data;
  } else if (payload.bank_account_id) {
    const { data } = await accountsRepo.findById(payload.bank_account_id);
    creditAccount = data;
  } else {
    const { data } = await accountsRepo.findByCode("1020");
    creditAccount = data;
  }

  // Use supplier-specific AP child account if available, fall back to generic AP
  const { data: supplier } = await supplierPaymentsRepo.findById(receipt.supplier_id);
  let apAccount;
  if (supplier?.account_id) {
    const { data: supplierAccount } = await accountsRepo.findById(supplier.account_id);
    apAccount = supplierAccount;
  }
  if (!apAccount) {
    const { data: genericAp } = await accountsRepo.findByCode("2100");
    apAccount = genericAp;
  }

  if (!creditAccount || !apAccount) {
    console.log(
      "GL accounts not configured properly. AP Account:",
      apAccount,
      "Credit Account:",
      creditAccount,
    );
    throw new Error("GL_ACCOUNTS_NOT_CONFIGURED");
  }

  // Create journal entry: Dr AP / Cr Cash or Bank
  const ref = `SPM-${payload.reference}`;
  const { data: entry } = await journalRepo.createEntry({
    entry_date: new Date().toISOString().split("T")[0],
    reference: ref,
    source_type: "supplier_payment",
    description: `Payment for invoice ${receipt.invoice_number} - ${payload.payment_method}`,
  });

  if (!entry) throw new Error("FAILED_TO_CREATE_JOURNAL_ENTRY");

  await journalRepo.createLines([
    {
      journal_entry_id: entry.id,
      account_id: apAccount.id,
      debit: amount,
      credit: 0,
    },
    {
      journal_entry_id: entry.id,
      account_id: creditAccount.id,
      debit: 0,
      credit: amount,
    },
  ]);

  // Create supplier payment record
  const { data: payment, error: paymentErr } =
    await supplierPaymentsRepo.createPayment({
      supplier_id: receipt.supplier_id,
      payment_date: new Date().toISOString().split("T")[0],
      amount,
      payment_method: payload.payment_method,
      reference: payload.reference,
      bank_account_id: creditAccount.id,
      journal_entry_id: entry.id,
      created_by: context.userId,
      notes: payload.notes || `Payment for invoice ${receipt.invoice_number}`,
    });

  if (paymentErr) throw new Error("FAILED_TO_CREATE_PAYMENT");

  // Mark receipt as paid
  const { data, error } = await receiptsRepo.markReceiptPaid(id);
  if (error) throw error;

  await auditRepo.log({
    entity: "inventory_receipts",
    entity_id: id,
    action: "INVENTORY_RECEIPT_PAID",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      paid_at: data.paid_at,
      payment_method: payload.payment_method,
      reference: payload.reference,
      amount,
      journal_entry_id: entry.id,
    },
  });

  return data;
};

exports.cancelReceipt = async (id, payload, context) => {
  const { reason } = payload;

  const { data: receipt, error: fetchErr } = await receiptsRepo.getReceiptById(id);
  if (fetchErr || !receipt) throw new Error("RECEIPT_NOT_FOUND");
  if (receipt.status === "cancelled") throw new Error("RECEIPT_ALREADY_CANCELLED");
  if (receipt.paid_at) throw new Error("CANNOT_CANCEL_PAID_RECEIPT");

  const items = receipt.inventory_receipt_items || [];
  const today = new Date().toISOString().split("T")[0];

  // Reverse inventory movement for every line item
  const reversingMovements = items.map((item) => ({
    product_id: item.product_id,
    movement_date: today,
    quantity: -item.quantity,
    unit_cost: item.unit_cost,
    movement_type: "purchase_return",
    reference_type: "inventory_receipt",
    reference_id: id,
    notes: reason || `Cancelled – return of damaged goods (${receipt.invoice_number})`,
    created_by: context.userId,
  }));

  if (reversingMovements.length > 0) {
    for (const movement of reversingMovements) {
      await pool.query(
        `INSERT INTO inventory_movements
           (product_id, movement_date, quantity, unit_cost, movement_type, reference_type, reference_id, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          movement.product_id,
          movement.movement_date,
          movement.quantity,
          movement.unit_cost,
          movement.movement_type,
          movement.reference_type,
          movement.reference_id,
          movement.notes,
          movement.created_by,
        ]
      );
    }
  }

  // Reverse the purchase journal entry (DR Inv / CR AP → DR AP / CR Inv)
  const originalEntry = await journalRepo.findBySourceId("inventory_receipt", id);
  if (originalEntry?.journal_lines?.length > 0) {
    const { data: reversalEntry, error: jeErr } = await journalRepo.createEntry({
      entry_date: today,
      source_type: "inventory_receipt_return",
      source_id: id,
      description: `Purchase return – ${receipt.invoice_number}${reason ? ` (${reason})` : ""}`,
    });
    if (jeErr) throw new Error("FAILED_TO_CREATE_REVERSAL_JOURNAL");

    await journalRepo.createLines(
      originalEntry.journal_lines.map((l) => ({
        journal_entry_id: reversalEntry.id,
        account_id: l.account_id,
        debit: l.credit,
        credit: l.debit,
      }))
    );

    // Link original entry to its reversal
    await journalRepo.updateReversedEntryId(originalEntry.id, reversalEntry.id);
  }

  // Mark receipt as cancelled
  const { data, error } = await receiptsRepo.cancelReceipt(id, context.userId);
  if (error) throw new Error("FAILED_TO_CANCEL_RECEIPT");

  await auditRepo.log({
    entity: "inventory_receipts",
    entity_id: id,
    action: "INVENTORY_RECEIPT_CANCELLED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { invoice_number: receipt.invoice_number, reason },
  });

  return data;
};

exports.receiveInventory = async (payload, context) => {
  if (!payload.supplier_id) throw new Error("SUPPLIER_REQUIRED");
  if (!payload.invoice_number) throw new Error("INVOICE_NUMBER_REQUIRED");
  if (!payload.purchase_date) throw new Error("PURCHASE_DATE_REQUIRED");
  if (!Array.isArray(payload.line_items) || payload.line_items.length === 0) {
    throw new Error("RECEIPT_ITEMS_REQUIRED");
  }

  const { data } = await receiptsRepo.receiveInventory(
    payload,
    context.userId,
  );

  await auditRepo.log({
    entity: "inventory_receipts",
    entity_id: data,
    action: "INVENTORY_RECEIPT_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      supplier_id: payload.supplier_id,
      invoice_number: payload.invoice_number,
      total_amount: payload.total_amount,
      item_count: payload.line_items.length,
    },
  });

  return data;
};

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
  const { data: receipt, error: receiptErr } = await receiptsRepo.getReceiptById(id);
  if (receiptErr || !receipt) throw new Error("RECEIPT_NOT_FOUND");
  if (receipt.paid_at) throw new Error("RECEIPT_ALREADY_PAID");

  const amount = Number(payload.amount || receipt.total_amount);

  // Determine which account to credit (cash or bank)
  const accountCode = payload.payment_method === "cash" ? "1010" : "1020";
  const { data: creditAccount } = await accountsRepo.findByCode(accountCode);
  const { data: apAccount } = await accountsRepo.findByCode("AP");

  if (!creditAccount || !apAccount) throw new Error("GL_ACCOUNTS_NOT_CONFIGURED");

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
    { journal_entry_id: entry.id, account_id: apAccount.id, debit: amount, credit: 0 },
    { journal_entry_id: entry.id, account_id: creditAccount.id, debit: 0, credit: amount },
  ]);

  // Create supplier payment record
  const { data: payment, error: paymentErr } = await supplierPaymentsRepo.createPayment({
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

exports.receiveInventory = async (payload, context) => {
  if (!payload.supplier_id) throw new Error("SUPPLIER_REQUIRED");
  if (!payload.invoice_number) throw new Error("INVOICE_NUMBER_REQUIRED");
  if (!payload.purchase_date) throw new Error("PURCHASE_DATE_REQUIRED");
  if (!Array.isArray(payload.line_items) || payload.line_items.length === 0) {
    throw new Error("RECEIPT_ITEMS_REQUIRED");
  }

  const { data, error } = await receiptsRepo.receiveInventory(
    payload,
    context.userId,
  );

  if (error) {
    throw new Error("FAILED_TO_CREATE_RECEIPT");
  }

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

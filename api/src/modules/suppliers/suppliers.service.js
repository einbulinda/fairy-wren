const repo = require("./suppliers.repository");
const auditRepo = require("../audit/audit.repository");
const journalRepo = require("../journals/journals.repository");
const accountsRepo = require("../accounts/accounts.repository");
const accountsService = require("../accounts/accounts.service");
const {
  CreateSupplierDTO,
  UpdateSupplierDTO,
  CreatePaymentDTO,
} = require("./suppliers.dto");

exports.list = async () => {
  const { data, error } = await repo.findAll();
  if (error) throw new Error("FAILED_TO_FETCH_SUPPLIERS");
  return data;
};

exports.getById = async (id) => {
  const { data, error } = await repo.findById(id);
  if (error || !data) throw new Error("SUPPLIER_NOT_FOUND");
  return data;
};

exports.create = async (payload, context) => {
  if (!payload.name) {
    throw new Error("INVALID_SUPPLIER_DATA");
  }

  const dto = CreateSupplierDTO(payload);

  // Auto-create a child GL account under Trade Payables (AP)
  const { data: apParent } = await accountsRepo.findByCode("2100");
  let accountId = null;

  if (apParent) {
    const nextCode = await accountsRepo.getNextChildCode(
      apParent.id,
      apParent.code,
    );
    const account = await accountsService.create(
      {
        name: dto.name,
        code: nextCode,
        account_class: apParent.account_class || "liability",
        parent_id: apParent.id,
        normal_balance: "credit",
        is_control_account: false,
      },
      context,
    );
    accountId = account.id;
  }

  const { data, error } = await repo.create({
    ...dto,
    account_id: accountId,
    active: true,
  });

  if (error) throw new Error("FAILED_TO_CREATE_SUPPLIER");

  await auditRepo.log({
    entity: "suppliers",
    entity_id: data.id,
    action: "SUPPLIER_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: data.name, account_id: accountId },
  });

  return data;
};

exports.update = async (id, payload, context) => {
  const dto = UpdateSupplierDTO(payload);

  if (Object.keys(dto).length === 0) {
    throw new Error("NO_FIELDS_TO_UPDATE");
  }

  const { data, error } = await repo.update(id, dto);
  if (error || !data) throw new Error("FAILED_TO_UPDATE_SUPPLIER");

  await auditRepo.log({
    entity: "suppliers",
    entity_id: id,
    action: "SUPPLIER_UPDATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: dto,
  });

  return data;
};

exports.archive = async (id, active, context) => {
  const { error } = await repo.archive(id, active);
  if (error) throw new Error("FAILED_TO_ARCHIVE_SUPPLIER");

  await auditRepo.log({
    entity: "suppliers",
    entity_id: id,
    action: "SUPPLIER_ARCHIVED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });
};

exports.getPendingInvoices = async () => {
  const { data, error } = await repo.findPendingInvoices();
  if (error) throw new Error("FAILED_TO_FETCH_PENDING_INVOICES");
  return data;
};

exports.getPurchases = async (id) => {
  const { data, error } = await repo.findPurchases(id);
  if (error) throw new Error("FAILED_TO_FETCH_PURCHASES");
  return data;
};

exports.getPayments = async (id) => {
  const { data, error } = await repo.findPayments(id);
  if (error) throw new Error("FAILED_TO_FETCH_PAYMENTS");
  return data;
};

exports.getStatement = async (id, from, to) => {
  const { data, error } = await repo.findStatement(
    id,
    from || null,
    to || null,
  );
  if (error) throw new Error("FAILED_TO_FETCH_STATEMENT");
  return data;
};

exports.getUnpaidInvoices = async (supplierId) => {
  const { data, error } = await repo.findUnpaidInvoices(supplierId);
  if (error) throw new Error("FAILED_TO_FETCH_UNPAID_INVOICES");
  return data;
};

exports.createPayment = async (supplierId, payload, context) => {
  if (!payload.payment_date || !payload.amount) {
    throw new Error("INVALID_PAYMENT_DATA");
  }

  const dto = CreatePaymentDTO(payload);
  const allocations = payload.allocations || []; // [{ invoice_id, amount }]

  // Auto-post journal: Dr supplier AP account / Cr Bank if both accounts are available
  let journalEntryId = null;
  if (dto.bank_account_id) {
    // Use supplier-specific AP child account if available, fall back to generic AP
    const { data: supplier } = await repo.findById(supplierId);
    let apAccount;
    if (supplier?.account_id) {
      const { data: supplierAccount } = await accountsRepo.findById(
        supplier.account_id,
      );
      apAccount = supplierAccount;
    }
    if (!apAccount) {
      const { data: genericAp } = await accountsRepo.findByCode("2100");
      apAccount = genericAp;
    }
    if (apAccount) {
      const ref = `SPM-${dto.reference || dto.payment_date}`;
      const { data: entry } = await journalRepo.createEntry({
        entry_date: dto.payment_date,
        reference: ref,
        source_type: "supplier_payment",
        description: `Supplier payment${dto.notes ? ` - ${dto.notes}` : ""}`,
      });
      if (entry) {
        await journalRepo.createLines([
          {
            journal_entry_id: entry.id,
            account_id: apAccount.id,
            debit: dto.amount,
            credit: 0,
          },
          {
            journal_entry_id: entry.id,
            account_id: dto.bank_account_id,
            debit: 0,
            credit: dto.amount,
          },
        ]);
        journalEntryId = entry.id;
      }
    }
  }

  const { data, error } = await repo.createPayment({
    supplier_id: supplierId,
    ...dto,
    journal_entry_id: journalEntryId,
    created_by: context.userId,
  });

  if (error) throw new Error("FAILED_TO_CREATE_PAYMENT");

  // Save invoice allocations and update invoice balances
  if (allocations.length > 0 && data?.id) {
    const allocationRows = allocations
      .filter((a) => a.amount > 0)
      .map((a) => ({
        payment_id: data.id,
        invoice_id: a.invoice_id,
        amount: a.amount,
      }));

    if (allocationRows.length > 0) {
      await repo.createPaymentAllocations(allocationRows);

      // Update each invoice's amount_paid and mark fully paid
      for (const alloc of allocationRows) {
        const { data: inv } = await repo.findInvoiceById(alloc.invoice_id);
        if (inv) {
          const newPaid = Number(inv.amount_paid || 0) + alloc.amount;
          await repo.updateInvoiceAmountPaid(
            alloc.invoice_id,
            newPaid,
            Number(inv.total_amount),
          );
        }
      }
    }
  }

  await auditRepo.log({
    entity: "supplier_payments",
    entity_id: data.id,
    action: "SUPPLIER_PAYMENT_RECORDED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      supplier_id: supplierId,
      amount: dto.amount,
      allocations: allocations.length,
    },
  });

  return data;
};

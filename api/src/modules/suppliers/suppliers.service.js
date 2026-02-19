const repo = require("./suppliers.repository");
const auditRepo = require("../audit/audit.repository");
const journalRepo = require("../journals/journals.repository");
const accountsRepo = require("../accounts/accounts.repository");
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

  const { data, error } = await repo.create({
    ...dto,
    active: true,
  });

  if (error) throw new Error("FAILED_TO_CREATE_SUPPLIER");

  await auditRepo.log({
    entity: "suppliers",
    entity_id: data.id,
    action: "SUPPLIER_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: data.name },
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
  const { data, error } = await repo.findStatement(id, from || null, to || null);
  if (error) throw new Error("FAILED_TO_FETCH_STATEMENT");
  return data;
};

exports.createPayment = async (supplierId, payload, context) => {
  if (!payload.payment_date || !payload.amount) {
    throw new Error("INVALID_PAYMENT_DATA");
  }

  const dto = CreatePaymentDTO(payload);

  // Auto-post journal: Dr AP / Cr Bank if both accounts are available
  let journalEntryId = null;
  if (dto.bank_account_id) {
    const { data: apAccount } = await accountsRepo.findByCode("AP");
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
          { journal_entry_id: entry.id, account_id: apAccount.id, debit: dto.amount, credit: 0 },
          { journal_entry_id: entry.id, account_id: dto.bank_account_id, debit: 0, credit: dto.amount },
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

  await auditRepo.log({
    entity: "supplier_payments",
    entity_id: data.id,
    action: "SUPPLIER_PAYMENT_RECORDED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { supplier_id: supplierId, amount: dto.amount },
  });

  return data;
};

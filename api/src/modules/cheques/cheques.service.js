const repo = require("./cheques.repository");
const journalRepo = require("../journals/journals.repository");
const { CreateChequeDTO } = require("./cheques.dto");
const auditRepo = require("../audit/audit.repository");

exports.list = async (filters) => {
  const { data, error } = await repo.findAll(filters);
  if (error) throw new Error("FAILED_TO_FETCH_CHEQUES");
  return data;
};

exports.getById = async (id) => {
  const { data, error } = await repo.findById(id);
  if (error || !data) throw new Error("CHEQUE_NOT_FOUND");
  return data;
};

exports.create = async (payload, context) => {
  const dto = CreateChequeDTO(payload);

  // Check cheque number uniqueness
  const { data: existing } = await repo.findByNumber(dto.cheque_number);
  if (existing) throw new Error("CHEQUE_NUMBER_ALREADY_EXISTS");

  // Insert cheque record
  const { data: cheque, error: chequeError } = await repo.create({
    ...dto,
    created_by: context.userId,
  });
  if (chequeError) throw new Error("FAILED_TO_CREATE_CHEQUE");

  // Auto-create journal entry: Dr debit_account, Cr bank_account
  const { data: entry, error: entryError } = await journalRepo.createEntry({
    entry_date: dto.cheque_date,
    reference: `CHQ-${dto.cheque_number}`,
    description: `Cheque to ${dto.payee_name}${dto.memo ? ` - ${dto.memo}` : ""}`,
    source_type: "cheque",
    source_id: cheque.id,
  });
  if (entryError) throw new Error("FAILED_TO_CREATE_CHEQUE_JOURNAL");

  const { error: linesError } = await journalRepo.createLines([
    { journal_entry_id: entry.id, account_id: dto.debit_account_id, debit: dto.amount, credit: 0 },
    { journal_entry_id: entry.id, account_id: dto.bank_account_id, debit: 0, credit: dto.amount },
  ]);
  if (linesError) throw new Error("FAILED_TO_CREATE_CHEQUE_JOURNAL_LINES");

  // Link journal back to cheque
  await repo.linkJournal(cheque.id, entry.id);

  await auditRepo.log({
    entity: "cheques",
    entity_id: cheque.id,
    action: "CHEQUE_ISSUED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { cheque_number: dto.cheque_number, payee: dto.payee_name, amount: dto.amount },
  });

  return exports.getById(cheque.id);
};

exports.clear = async (id, context) => {
  const cheque = await exports.getById(id);
  if (cheque.status !== "issued") throw new Error("CHEQUE_NOT_IN_ISSUED_STATUS");

  const { data, error } = await repo.updateStatus(id, "cleared", {
    cleared_at: new Date().toISOString(),
  });
  if (error) throw new Error("FAILED_TO_CLEAR_CHEQUE");

  await auditRepo.log({
    entity: "cheques",
    entity_id: id,
    action: "CHEQUE_CLEARED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { cheque_number: cheque.cheque_number },
  });

  return data;
};

exports.void = async (id, context) => {
  const cheque = await exports.getById(id);
  if (cheque.status === "voided") throw new Error("CHEQUE_ALREADY_VOIDED");

  // Create reversal journal entry
  if (cheque.journal_entry_id) {
    const { data: original } = await journalRepo.findById(cheque.journal_entry_id);
    if (original) {
      const { data: reversal, error: revError } = await journalRepo.createEntry({
        entry_date: new Date().toISOString().split("T")[0],
        reference: `VOID-CHQ-${cheque.cheque_number}`,
        description: `Void cheque to ${cheque.payee_name}`,
        source_type: "cheque",
        source_id: cheque.id,
      });
      if (!revError && reversal) {
        const reversalLines = original.journal_lines.map((l) => ({
          journal_entry_id: reversal.id,
          account_id: l.account_id,
          debit: l.credit,
          credit: l.debit,
        }));
        await journalRepo.createLines(reversalLines);
        await journalRepo.updateReversedEntryId(cheque.journal_entry_id, reversal.id);
      }
    }
  }

  const { data, error } = await repo.updateStatus(id, "voided", {
    voided_at: new Date().toISOString(),
  });
  if (error) throw new Error("FAILED_TO_VOID_CHEQUE");

  await auditRepo.log({
    entity: "cheques",
    entity_id: id,
    action: "CHEQUE_VOIDED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { cheque_number: cheque.cheque_number },
  });

  return data;
};

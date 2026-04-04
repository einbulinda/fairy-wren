const repo = require("./cheques.repository");
const journalRepo = require("../journals/journals.repository");
const supplierRepo = require("../suppliers/suppliers.repository");
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

  // Insert cheque record (expense_lines is used for journal lines only, not a DB column)
  const { expense_lines, ...chequeFields } = dto;
  const { data: cheque, error: chequeError } = await repo.create({
    ...chequeFields,
    created_by: context.userId,
  });
  if (chequeError) throw new Error("FAILED_TO_CREATE_CHEQUE");

  // Auto-create journal entry: Dr debit_account, Cr bank_account
  const isTransfer = dto.transaction_type === "transfer";
  const reference = isTransfer
    ? `TRF-${dto.cheque_number}`
    : `CHQ-${dto.cheque_number}`;
  const description = isTransfer
    ? `Internal transfer${dto.memo ? ` - ${dto.memo}` : ""}`
    : `Cheque to ${dto.payee_name}${dto.memo ? ` - ${dto.memo}` : ""}`;

  const { data: entry, error: entryError } = await journalRepo.createEntry({
    entry_date: dto.cheque_date,
    reference,
    description,
    source_type: "cheque",
    source_id: cheque.id,
  });
  if (entryError) throw new Error("FAILED_TO_CREATE_CHEQUE_JOURNAL");

  const isExpense = dto.payee_type === "expense";
  const journalLines = isExpense
    ? [
        // One debit line per expense account
        ...dto.expense_lines.map((line) => ({
          journal_entry_id: entry.id,
          account_id: line.account_id,
          debit: line.amount,
          credit: 0,
        })),
        // Single credit to bank
        {
          journal_entry_id: entry.id,
          account_id: dto.bank_account_id,
          debit: 0,
          credit: dto.amount,
        },
      ]
    : [
        {
          journal_entry_id: entry.id,
          account_id: dto.debit_account_id,
          debit: dto.amount,
          credit: 0,
        },
        {
          journal_entry_id: entry.id,
          account_id: dto.bank_account_id,
          debit: 0,
          credit: dto.amount,
        },
      ];

  const { error: linesError } = await journalRepo.createLines(journalLines);
  if (linesError) throw new Error("FAILED_TO_CREATE_CHEQUE_JOURNAL_LINES");

  // Link journal back to cheque
  await repo.linkJournal(cheque.id, entry.id);

  // Record supplier payment so it appears in supplier payments & statement
  if (dto.payee_type === "supplier" && dto.payee_id) {
    await supplierRepo.createPayment({
      supplier_id: dto.payee_id,
      payment_date: dto.cheque_date,
      amount: dto.amount,
      payment_method: "cheque",
      reference: dto.cheque_number,
      bank_account_id: dto.bank_account_id,
      notes: dto.memo || `Cheque ${dto.cheque_number}`,
      journal_entry_id: entry.id,
      created_by: context.userId,
    });
  }

  await auditRepo.log({
    entity: "cheques",
    entity_id: cheque.id,
    action: "CHEQUE_ISSUED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      cheque_number: dto.cheque_number,
      payee: dto.payee_name,
      payee_type: dto.payee_type,
      amount: dto.amount,
      bank_account_id: dto.bank_account_id,
      ...(isExpense && { expense_lines: dto.expense_lines }),
    },
  });

  return exports.getById(cheque.id);
};

exports.clear = async (id, context) => {
  const cheque = await exports.getById(id);
  if (cheque.status !== "issued")
    throw new Error("CHEQUE_NOT_IN_ISSUED_STATUS");

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
    const { data: original } = await journalRepo.findById(
      cheque.journal_entry_id,
    );
    if (original) {
      const isTransfer = cheque.transaction_type === "transfer";
      const { data: reversal, error: revError } = await journalRepo.createEntry(
        {
          entry_date: new Date().toISOString().split("T")[0],
          reference: isTransfer
            ? `VOID-TRF-${cheque.cheque_number}`
            : `VOID-CHQ-${cheque.cheque_number}`,
          description: isTransfer
            ? `Void transfer ${cheque.cheque_number}`
            : `Void cheque to ${cheque.payee_name}`,
          source_type: "cheque",
          source_id: cheque.id,
        },
      );
      if (!revError && reversal) {
        const reversalLines = original.journal_lines.map((l) => ({
          journal_entry_id: reversal.id,
          account_id: l.account_id,
          debit: l.credit,
          credit: l.debit,
        }));
        await journalRepo.createLines(reversalLines);
        await journalRepo.updateReversedEntryId(
          cheque.journal_entry_id,
          reversal.id,
        );
      }
    }
  }

  // Remove linked supplier payment if this was a supplier cheque
  if (cheque.payee_type === "supplier" && cheque.journal_entry_id) {
    await supplierRepo.deletePaymentByJournalId(cheque.journal_entry_id);
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

const repo = require("./expenses.repository");
const journalRepo = require("../journals/journals.repository");
const { CreateExpenseDTO } = require("./expenses.dto");
const auditRepo = require("../audit/audit.repository");

exports.list = async (filters) => {
  const { data, error } = await repo.findAll(filters);
  if (error) throw new Error("FAILED_TO_FETCH_EXPENSES");
  return data;
};

exports.create = async (payload, context) => {
  if (!payload?.expense_date || payload.amount === undefined)
    throw new Error("MISSING_REQUIRED_FIELDS");
  if (!payload?.account_id) throw new Error("EXPENSE_ACCOUNT_REQUIRED");
  if (!payload?.credit_account_id) throw new Error("CREDIT_ACCOUNT_REQUIRED");

  const dto = CreateExpenseDTO(payload);
  dto.created_by = context.userId;

  // Insert expense record
  const { data: expense, error: expenseError } = await repo.create(dto);
  if (expenseError) throw new Error("FAILED_TO_CREATE_EXPENSE");

  // Auto-create journal entry: Dr expense account, Cr credit account
  const reference = expense.invoice_number
    ? `EXP-${expense.invoice_number}`
    : `EXP-${expense.id.slice(0, 8)}`;
  const description = expense.description || "Expense";

  const { data: entry, error: entryError } = await journalRepo.createEntry({
    entry_date: dto.expense_date,
    reference,
    description,
    source_type: "expense",
    source_id: expense.id,
  });
  if (entryError) throw new Error("FAILED_TO_CREATE_EXPENSE_JOURNAL");

  const { error: linesError } = await journalRepo.createLines([
    {
      journal_entry_id: entry.id,
      account_id: dto.account_id,
      debit: dto.amount,
      credit: 0,
    },
    {
      journal_entry_id: entry.id,
      account_id: dto.credit_account_id,
      debit: 0,
      credit: dto.amount,
    },
  ]);
  if (linesError) throw new Error("FAILED_TO_CREATE_EXPENSE_JOURNAL_LINES");

  // Link journal back to expense
  await repo.linkJournal(expense.id, entry.id);

  await auditRepo.log({
    entity: "expense",
    entity_id: expense.id,
    action: "CREATE",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { amount: expense.amount, expense_date: expense.expense_date },
  });

  return expense;
};

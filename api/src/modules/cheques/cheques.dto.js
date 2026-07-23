const VALID_TYPES = ["bank_cheque", "petty_cash", "transfer"];
const VALID_PAYEE_TYPES = ["supplier", "employee", "expense", "other"];

exports.CreateChequeDTO = (payload) => {
  const {
    cheque_number, payee_name, payee_type, payee_id,
    bank_account_id, debit_account_id,
    amount, cheque_date, memo, transaction_type,
    expense_lines,
  } = payload;

  const type = transaction_type || "bank_cheque";
  if (!VALID_TYPES.includes(type)) throw new Error("INVALID_TRANSACTION_TYPE");

  if (!cheque_number?.trim()) throw new Error("CHEQUE_NUMBER_REQUIRED");

  const resolvedPayeeType = type === "transfer" ? "other" : (payee_type || "other");
  if (!VALID_PAYEE_TYPES.includes(resolvedPayeeType)) throw new Error("INVALID_PAYEE_TYPE");

  const resolvedPayee = type === "transfer"
    ? (payee_name?.trim() || "Internal Transfer")
    : payee_name?.trim();
  if (type !== "transfer" && resolvedPayeeType !== "expense" && !resolvedPayee)
    throw new Error("PAYEE_NAME_REQUIRED");

  if ((resolvedPayeeType === "supplier" || resolvedPayeeType === "employee") && !payee_id)
    throw new Error("PAYEE_ID_REQUIRED");

  if (!bank_account_id) throw new Error("BANK_ACCOUNT_REQUIRED");

  // debit_account_id required for non-expense, non-transfer
  if (resolvedPayeeType !== "expense" && type !== "transfer" && !debit_account_id)
    throw new Error("DEBIT_ACCOUNT_REQUIRED");
  if (type === "transfer" && !debit_account_id)
    throw new Error("DEBIT_ACCOUNT_REQUIRED");

  if (!cheque_date) throw new Error("CHEQUE_DATE_REQUIRED");

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("INVALID_AMOUNT");

  // Validate expense lines
  let resolvedExpenseLines = null;
  if (resolvedPayeeType === "expense") {
    const lines = Array.isArray(expense_lines) ? expense_lines : [];
    const validLines = lines.filter(
      (l) => l.account_id && Number(l.amount) > 0,
    );
    if (validLines.length === 0) throw new Error("EXPENSE_LINES_REQUIRED");

    const lineTotal = validLines.reduce((s, l) => s + Number(l.amount), 0);
    if (Math.round(lineTotal * 100) > Math.round(parsedAmount * 100))
      throw new Error("EXPENSE_LINES_EXCEED_TOTAL");

    const accountIds = validLines.map((l) => l.account_id);
    if (new Set(accountIds).size !== accountIds.length)
      throw new Error("DUPLICATE_EXPENSE_ACCOUNTS");

    resolvedExpenseLines = validLines.map((l) => ({
      account_id: l.account_id,
      amount: Number(l.amount),
      description: l.description ? String(l.description).trim().slice(0, 255) : null,
    }));
  }

  return {
    cheque_number: cheque_number.trim(),
    payee_name: resolvedPayeeType === "expense"
      ? (memo?.trim() || "Expense Payment")
      : resolvedPayee,
    payee_type: resolvedPayeeType,
    payee_id: payee_id || null,
    bank_account_id,
    debit_account_id: resolvedPayeeType === "expense" ? null : debit_account_id,
    amount: parsedAmount,
    cheque_date,
    memo: memo?.trim() || null,
    transaction_type: type,
    expense_lines: resolvedExpenseLines,
  };
};

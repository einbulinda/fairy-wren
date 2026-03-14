const VALID_TYPES = ["bank_cheque", "petty_cash", "transfer"];
const VALID_PAYEE_TYPES = ["supplier", "employee", "other"];

exports.CreateChequeDTO = (payload) => {
  const {
    cheque_number, payee_name, payee_type, payee_id,
    bank_account_id, debit_account_id,
    amount, cheque_date, memo, transaction_type,
  } = payload;

  const type = transaction_type || "bank_cheque";
  if (!VALID_TYPES.includes(type)) throw new Error("INVALID_TRANSACTION_TYPE");

  if (!cheque_number?.trim()) throw new Error("CHEQUE_NUMBER_REQUIRED");

  // Payee type
  const resolvedPayeeType = type === "transfer" ? "other" : (payee_type || "other");
  if (!VALID_PAYEE_TYPES.includes(resolvedPayeeType)) throw new Error("INVALID_PAYEE_TYPE");

  // payee_name is optional for transfers — defaults to "Internal Transfer"
  const resolvedPayee = type === "transfer"
    ? (payee_name?.trim() || "Internal Transfer")
    : payee_name?.trim();
  if (type !== "transfer" && !resolvedPayee) throw new Error("PAYEE_NAME_REQUIRED");

  // payee_id is required for supplier/employee types
  if ((resolvedPayeeType === "supplier" || resolvedPayeeType === "employee") && !payee_id) {
    throw new Error("PAYEE_ID_REQUIRED");
  }

  if (!bank_account_id) throw new Error("BANK_ACCOUNT_REQUIRED");
  if (!debit_account_id) throw new Error("DEBIT_ACCOUNT_REQUIRED");
  if (!cheque_date) throw new Error("CHEQUE_DATE_REQUIRED");

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("INVALID_AMOUNT");

  return {
    cheque_number: cheque_number.trim(),
    payee_name: resolvedPayee,
    payee_type: resolvedPayeeType,
    payee_id: payee_id || null,
    bank_account_id,
    debit_account_id,
    amount: parsedAmount,
    cheque_date,
    memo: memo?.trim() || null,
    transaction_type: type,
  };
};

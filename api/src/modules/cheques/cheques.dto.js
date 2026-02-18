exports.CreateChequeDTO = (payload) => {
  const { cheque_number, payee_name, bank_account_id, debit_account_id, amount, cheque_date, memo } = payload;

  if (!cheque_number?.trim()) throw new Error("CHEQUE_NUMBER_REQUIRED");
  if (!payee_name?.trim()) throw new Error("PAYEE_NAME_REQUIRED");
  if (!bank_account_id) throw new Error("BANK_ACCOUNT_REQUIRED");
  if (!debit_account_id) throw new Error("DEBIT_ACCOUNT_REQUIRED");
  if (!cheque_date) throw new Error("CHEQUE_DATE_REQUIRED");

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("INVALID_AMOUNT");

  return {
    cheque_number: cheque_number.trim(),
    payee_name: payee_name.trim(),
    bank_account_id,
    debit_account_id,
    amount: parsedAmount,
    cheque_date,
    memo: memo?.trim() || null,
  };
};

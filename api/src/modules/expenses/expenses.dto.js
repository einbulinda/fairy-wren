exports.CreateExpenseDTO = (payload) => ({
  expense_date: String(payload.expense_date).trim(),
  supplier_id: payload.supplier_id || null,
  account_id: payload.account_id || null,
  description: payload.description ? String(payload.description).trim() : null,
  invoice_number: payload.invoice_number
    ? String(payload.invoice_number).trim()
    : null,
  amount: Number(payload.amount),
  credit_account_id: payload.credit_account_id || null,
});

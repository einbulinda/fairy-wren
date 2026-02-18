const VALID_SOURCE_TYPES = ["manual", "payment", "expense", "supplier_bill", "customer_invoice", "cheque"];

exports.CreateJournalDTO = (payload) => {
  const { entry_date, reference, description, lines } = payload;

  if (!entry_date) throw new Error("ENTRY_DATE_REQUIRED");
  if (!lines || !Array.isArray(lines) || lines.length < 2)
    throw new Error("MINIMUM_TWO_LINES_REQUIRED");

  const validatedLines = lines.map((line, i) => {
    const debit = Number(line.debit ?? 0);
    const credit = Number(line.credit ?? 0);

    if (!line.account_id) throw new Error(`LINE_${i + 1}_ACCOUNT_REQUIRED`);
    if (isNaN(debit) || isNaN(credit)) throw new Error(`LINE_${i + 1}_INVALID_AMOUNT`);
    if (debit < 0 || credit < 0) throw new Error(`LINE_${i + 1}_NEGATIVE_AMOUNT`);
    if (debit > 0 && credit > 0) throw new Error(`LINE_${i + 1}_CANNOT_HAVE_BOTH_DEBIT_AND_CREDIT`);

    return {
      account_id: line.account_id,
      description: line.description?.trim() || null,
      debit,
      credit,
    };
  });

  const totalDebits = validatedLines.reduce((s, l) => s + l.debit, 0);
  const totalCredits = validatedLines.reduce((s, l) => s + l.credit, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.001)
    throw new Error("JOURNAL_NOT_BALANCED");

  return {
    entry_date,
    reference: reference?.trim() || null,
    description: description?.trim() || null,
    source_type: "manual",
    lines: validatedLines,
  };
};

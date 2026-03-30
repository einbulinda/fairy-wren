const getSupabase = require("../../config/supabase");
const logger = require("../../utils/logger");

exports.listStatements = async (filters = {}) => {
  const supabase = getSupabase();

  let query = supabase
    .from("bank_statements")
    .select("*, bank_account:bank_account_id(code, name)")
    .order("statement_date", { ascending: false });

  if (filters.accountId)
    query = query.eq("bank_account_id", filters.accountId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.year) {
    query = query.gte("statement_date", `${filters.year}-01-01`);
    query = query.lte("statement_date", `${filters.year}-12-31`);
  }
  if (filters.month) {
    const year = filters.year || new Date().getFullYear();
    const month = String(filters.month).padStart(2, "0");
    query = query.gte("statement_date", `${year}-${month}-01`);
    query = query.lte("statement_date", `${year}-${month}-31`);
  }

  const { data, error } = await query;
  if (error) throw new Error("FAILED_TO_FETCH_STATEMENTS");
  return data || [];
};

exports.getStatement = async (id) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("rpc_get_bank_reconciliation", {
    p_bank_account_id: null,
    p_statement_id: id,
  });

  if (error) throw new Error("FAILED_TO_FETCH_STATEMENT");
  return data;
};

exports.getStatementWithLines = async (id) => {
  return exports.getStatement(id);
};

exports.getStatementByAccount = async (bankAccountId) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("rpc_get_bank_reconciliation", {
    p_bank_account_id: bankAccountId,
    p_statement_id: null,
  });

  if (error) throw new Error("FAILED_TO_FETCH_STATEMENT");
  return data;
};

exports.importStatement = async (payload) => {
  const supabase = getSupabase();
  const {
    bankAccountId,
    statementDate,
    startDate,
    endDate,
    openingBalance,
    closingBalance,
    lines,
    description,
    userId,
  } = payload;

  logger.info("Importing bank statement", {
    bankAccountId,
    statementDate,
    lineCount: lines.length,
    importedBy: userId,
  });

  const formattedLines = lines.map((l) => ({
    transaction_date: l.transaction_date || l.date,
    description: l.description,
    reference: l.reference,
    deposit: l.deposit || 0,
    withdrawal: l.withdrawal || 0,
  }));

  const { data, error } = await supabase.rpc("import_bank_statement", {
    p_bank_account_id: bankAccountId,
    p_statement_date: statementDate,
    p_statement_number: description || `Statement ${startDate} to ${endDate}`,
    p_opening_balance: openingBalance,
    p_closing_balance: closingBalance,
    p_lines: JSON.stringify(formattedLines),
    p_imported_by: userId,
    p_file_name: null,
  });

  if (error) {
    logger.error("Failed to import statement", { error: error.message });
    throw new Error(error.message || "FAILED_TO_IMPORT_STATEMENT");
  }

  // data is the statement_id from the RPC; return a shaped object
  return { id: data, success: true };
};

exports.autoMatch = async (statementId, opts = {}) => {
  const supabase = getSupabase();

  logger.info("Auto-matching statement lines", { statementId });

  const { data, error } = await supabase.rpc("auto_match_bank_statement", {
    p_statement_id: statementId,
    p_match_threshold: 0.01,
  });

  if (error) {
    logger.error("Auto-match failed", { error: error.message });
    throw new Error(error.message || "FAILED_TO_AUTO_MATCH");
  }

  return data;
};

exports.manualMatch = async (statementId, lineId, journalEntryId, adjustmentAmount) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("manual_match_statement_line", {
    p_line_id: lineId,
    p_transaction_id: journalEntryId,
    p_transaction_type: "journal_entry",
    p_matched_by: null,
    p_notes: adjustmentAmount ? `Adjustment: ${adjustmentAmount}` : null,
  });

  if (error) throw new Error(error.message || "FAILED_TO_MANUAL_MATCH");
  return data;
};

exports.unmatchLine = async (statementId, lineId) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("bank_statement_lines")
    .update({
      match_status: "unmatched",
      matched_transaction_id: null,
      matched_transaction_type: null,
      matched_by: null,
      matched_at: null,
      match_notes: null,
    })
    .eq("id", lineId)
    .select()
    .single();

  if (error) throw new Error("FAILED_TO_UNMATCH_LINE");
  return data;
};

exports.getSuggestedMatches = async (lineId) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("rpc_get_suggested_matches", {
    p_line_id: lineId,
  });

  if (error) throw new Error("FAILED_TO_GET_SUGGESTIONS");
  return data || [];
};

exports.getUnreconciledTransactions = async (bankAccountId) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("v_unreconciled_bank_transactions")
    .select("*")
    .eq("account_id", bankAccountId)
    .order("entry_date", { ascending: false });

  if (error) throw new Error("FAILED_TO_FETCH_UNRECONCILED");
  return data || [];
};

exports.getBankGlDetails = async (accountId, startDate, endDate) => {
  const supabase = getSupabase();

  let query = supabase
    .from("v_unreconciled_bank_transactions")
    .select("*")
    .eq("account_id", accountId)
    .order("entry_date", { ascending: false });

  if (startDate) query = query.gte("entry_date", startDate);
  if (endDate) query = query.lte("entry_date", endDate);

  const { data, error } = await query;
  if (error) throw new Error("FAILED_TO_FETCH_BANK_GL");
  return data || [];
};

exports.getReconciliationSummary = async (bankAccountId) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("v_bank_reconciliation_summary")
    .select("*")
    .eq("bank_account_id", bankAccountId)
    .order("statement_date", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw new Error("FAILED_TO_FETCH_SUMMARY");
  return data;
};

exports.getReconciliationReport = async (statementId) => {
  const supabase = getSupabase();

  const { data: statement, error: stmtError } = await supabase
    .from("bank_statements")
    .select("*, bank_account:bank_account_id(code, name)")
    .eq("id", statementId)
    .single();

  if (stmtError) throw new Error("FAILED_TO_FETCH_REPORT");

  const { data: lines, error: linesError } = await supabase
    .from("bank_statement_lines")
    .select("*")
    .eq("statement_id", statementId)
    .order("transaction_date", { ascending: true });

  if (linesError) throw new Error("FAILED_TO_FETCH_REPORT_LINES");

  const { data: summary, error: summaryError } = await supabase
    .from("v_bank_reconciliation_summary")
    .select("*")
    .eq("statement_id", statementId)
    .single();

  if (summaryError && summaryError.code !== "PGRST116") throw new Error("FAILED_TO_FETCH_REPORT_SUMMARY");

  const totalDeposits = lines.reduce((s, l) => s + Number(l.deposit || 0), 0);
  const totalWithdrawals = lines.reduce((s, l) => s + Number(l.withdrawal || 0), 0);
  const matchedCount = lines.filter((l) => l.match_status === "matched").length;
  const unmatchedCount = lines.filter((l) => l.match_status === "unmatched").length;
  const computedClosing = Number(statement.opening_balance) + totalDeposits - totalWithdrawals;

  return {
    statement,
    lines: lines || [],
    summary: {
      total_deposits: totalDeposits,
      total_withdrawals: totalWithdrawals,
      matched_count: matchedCount,
      unmatched_count: unmatchedCount,
      computed_closing: computedClosing,
      difference: Number(statement.closing_balance) - computedClosing,
    },
  };
};

exports.finalizeReconciliation = async (statementId, reconciledBy, notes = null) => {
  const supabase = getSupabase();

  logger.info("Finalizing reconciliation", { statementId, reconciledBy });

  const { data: unmatched } = await supabase
    .from("bank_statement_lines")
    .select("count")
    .eq("statement_id", statementId)
    .eq("match_status", "unmatched")
    .single();

  if (unmatched?.count > 0) {
    throw new Error("CANNOT_FINALIZE_WITH_UNMATCHED_LINES");
  }

  const { data, error } = await supabase
    .from("bank_statements")
    .update({
      status: "reconciled",
      reconciled_by: reconciledBy,
      reconciled_at: new Date().toISOString(),
      notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", statementId)
    .select()
    .single();

  if (error) throw new Error("FAILED_TO_FINALIZE_RECONCILIATION");
  return data;
};

exports.finalize = async (statementId, adjustments, { userId }) => {
  // For MVP, ignore adjustments and just finalize
  return exports.finalizeReconciliation(statementId, userId);
};

exports.cancelStatement = async (statementId, reason) => {
  const supabase = getSupabase();

  logger.info("Cancelling bank statement", { statementId, reason });

  const { data, error } = await supabase
    .from("bank_statements")
    .update({
      status: "cancelled",
      notes: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", statementId)
    .select()
    .single();

  if (error) throw new Error("FAILED_TO_CANCEL_STATEMENT");
  return data;
};

exports.parseStatementFile = async (fileBuffer, fileType) => {
  logger.info("Parsing statement file", { fileType });
  return {
    openingBalance: 0,
    closingBalance: 0,
    lines: [],
  };
};

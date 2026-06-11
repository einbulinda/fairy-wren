const pool = require("../../config/db");
const logger = require("../../utils/logger");

exports.listStatements = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.accountId) {
    params.push(filters.accountId);
    conditions.push(`bs.bank_account_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`bs.status = $${params.length}`);
  }
  if (filters.year && !filters.month) {
    params.push(`${filters.year}-01-01`);
    conditions.push(`bs.statement_date >= $${params.length}`);
    params.push(`${filters.year}-12-31`);
    conditions.push(`bs.statement_date <= $${params.length}`);
  }
  if (filters.month) {
    const year = filters.year || new Date().getFullYear();
    const month = String(filters.month).padStart(2, "0");
    params.push(`${year}-${month}-01`);
    conditions.push(`bs.statement_date >= $${params.length}`);
    params.push(`${year}-${month}-31`);
    conditions.push(`bs.statement_date <= $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT bs.*,
       json_build_object('code', coa.code, 'name', coa.name) AS bank_account
     FROM bank_statements bs
     LEFT JOIN chart_of_accounts coa ON coa.id = bs.bank_account_id
     ${where}
     ORDER BY bs.statement_date DESC`,
    params
  );

  if (!rows) throw new Error("FAILED_TO_FETCH_STATEMENTS");
  return rows || [];
};

exports.getStatement = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM rpc_get_bank_reconciliation($1, $2)`,
    [null, id]
  );
  if (!rows) throw new Error("FAILED_TO_FETCH_STATEMENT");
  return rows;
};

exports.getStatementWithLines = async (id) => {
  return exports.getStatement(id);
};

exports.getStatementByAccount = async (bankAccountId) => {
  const { rows } = await pool.query(
    `SELECT * FROM rpc_get_bank_reconciliation($1, $2)`,
    [bankAccountId, null]
  );
  if (!rows) throw new Error("FAILED_TO_FETCH_STATEMENT");
  return rows;
};

exports.importStatement = async (payload) => {
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

  let rows;
  try {
    const result = await pool.query(
      `SELECT * FROM import_bank_statement($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
      [
        bankAccountId,
        statementDate,
        description || `Statement ${startDate} to ${endDate}`,
        openingBalance,
        closingBalance,
        JSON.stringify(formattedLines),
        userId,
        null,
      ]
    );
    rows = result.rows;
  } catch (err) {
    logger.error("Failed to import statement", { error: err.message });
    throw new Error(err.message || "FAILED_TO_IMPORT_STATEMENT");
  }

  // rows[0] is the statement_id from the RPC; return a shaped object
  return { id: rows[0], success: true };
};

exports.autoMatch = async (statementId, opts = {}) => {
  logger.info("Auto-matching statement lines", { statementId });

  let rows;
  try {
    const result = await pool.query(
      `SELECT * FROM auto_match_bank_statement($1, $2)`,
      [statementId, 0.01]
    );
    rows = result.rows;
  } catch (err) {
    logger.error("Auto-match failed", { error: err.message });
    throw new Error(err.message || "FAILED_TO_AUTO_MATCH");
  }

  return rows;
};

exports.manualMatch = async (statementId, lineId, journalEntryId, adjustmentAmount) => {
  let rows;
  try {
    const result = await pool.query(
      `SELECT * FROM manual_match_statement_line($1, $2, $3, $4, $5)`,
      [
        lineId,
        journalEntryId,
        "journal_entry",
        null,
        adjustmentAmount ? `Adjustment: ${adjustmentAmount}` : null,
      ]
    );
    rows = result.rows;
  } catch (err) {
    throw new Error(err.message || "FAILED_TO_MANUAL_MATCH");
  }
  return rows;
};

exports.unmatchLine = async (statementId, lineId) => {
  const { rows } = await pool.query(
    `UPDATE bank_statement_lines
     SET match_status = 'unmatched',
         matched_transaction_id = NULL,
         matched_transaction_type = NULL,
         matched_by = NULL,
         matched_at = NULL,
         match_notes = NULL
     WHERE id = $1
     RETURNING *`,
    [lineId]
  );
  if (!rows[0]) throw new Error("FAILED_TO_UNMATCH_LINE");
  return rows[0];
};

exports.getSuggestedMatches = async (lineId) => {
  const { rows } = await pool.query(
    `SELECT * FROM rpc_get_suggested_matches($1)`,
    [lineId]
  );
  return rows || [];
};

exports.getUnreconciledTransactions = async (bankAccountId) => {
  const { rows } = await pool.query(
    `SELECT * FROM v_unreconciled_bank_transactions
     WHERE account_id = $1
     ORDER BY entry_date DESC`,
    [bankAccountId]
  );
  if (!rows) throw new Error("FAILED_TO_FETCH_UNRECONCILED");
  return rows || [];
};

exports.getBankGlDetails = async (accountId, startDate, endDate) => {
  const conditions = [`account_id = $1`];
  const params = [accountId];

  if (startDate) {
    params.push(startDate);
    conditions.push(`entry_date >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`entry_date <= $${params.length}`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const { rows } = await pool.query(
    `SELECT * FROM v_unreconciled_bank_transactions ${where} ORDER BY entry_date DESC`,
    params
  );
  if (!rows) throw new Error("FAILED_TO_FETCH_BANK_GL");
  return rows || [];
};

exports.getReconciliationSummary = async (bankAccountId) => {
  const { rows } = await pool.query(
    `SELECT * FROM v_bank_reconciliation_summary
     WHERE bank_account_id = $1
     ORDER BY statement_date DESC
     LIMIT 1`,
    [bankAccountId]
  );
  return rows[0] || null;
};

exports.getReconciliationReport = async (statementId) => {
  const { rows: stmtRows } = await pool.query(
    `SELECT bs.*,
       json_build_object('code', coa.code, 'name', coa.name) AS bank_account
     FROM bank_statements bs
     LEFT JOIN chart_of_accounts coa ON coa.id = bs.bank_account_id
     WHERE bs.id = $1`,
    [statementId]
  );
  if (!stmtRows[0]) throw new Error("FAILED_TO_FETCH_REPORT");
  const statement = stmtRows[0];

  const { rows: lines } = await pool.query(
    `SELECT * FROM bank_statement_lines
     WHERE statement_id = $1
     ORDER BY transaction_date ASC`,
    [statementId]
  );
  if (!lines) throw new Error("FAILED_TO_FETCH_REPORT_LINES");

  const { rows: summaryRows } = await pool.query(
    `SELECT * FROM v_bank_reconciliation_summary WHERE statement_id = $1`,
    [statementId]
  );
  const summary = summaryRows[0] || null;

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
  logger.info("Finalizing reconciliation", { statementId, reconciledBy });

  const { rows: unmatchedRows } = await pool.query(
    `SELECT COUNT(*) AS count FROM bank_statement_lines
     WHERE statement_id = $1 AND match_status = 'unmatched'`,
    [statementId]
  );
  const unmatched = unmatchedRows[0];

  if (unmatched?.count > 0) {
    throw new Error("CANNOT_FINALIZE_WITH_UNMATCHED_LINES");
  }

  const now = new Date().toISOString();
  const { rows } = await pool.query(
    `UPDATE bank_statements
     SET status = 'reconciled',
         reconciled_by = $1,
         reconciled_at = $2,
         notes = $3,
         updated_at = $4
     WHERE id = $5
     RETURNING *`,
    [reconciledBy, now, notes, now, statementId]
  );
  if (!rows[0]) throw new Error("FAILED_TO_FINALIZE_RECONCILIATION");
  return rows[0];
};

exports.finalize = async (statementId, adjustments, { userId }) => {
  // For MVP, ignore adjustments and just finalize
  return exports.finalizeReconciliation(statementId, userId);
};

exports.cancelStatement = async (statementId, reason) => {
  logger.info("Cancelling bank statement", { statementId, reason });

  const now = new Date().toISOString();
  const { rows } = await pool.query(
    `UPDATE bank_statements
     SET status = 'cancelled',
         notes = $1,
         updated_at = $2
     WHERE id = $3
     RETURNING *`,
    [reason, now, statementId]
  );
  if (!rows[0]) throw new Error("FAILED_TO_CANCEL_STATEMENT");
  return rows[0];
};

exports.parseStatementFile = async (fileBuffer, fileType) => {
  logger.info("Parsing statement file", { fileType });
  return {
    openingBalance: 0,
    closingBalance: 0,
    lines: [],
  };
};

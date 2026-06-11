const pool = require("../../config/db");
const logger = require("../../utils/logger");

exports.list = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.year) {
    params.push(filters.year);
    conditions.push(`year = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT * FROM accounting_periods ${where} ORDER BY year DESC, month DESC`,
    params
  );
  return { data: rows, error: null };
};

exports.getById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM accounting_periods WHERE id = $1`,
    [id]
  );
  return { data: rows[0] || null, error: null };
};

exports.getCurrentStatus = async () => {
  const today = new Date().toISOString().split("T")[0];
  const { rows } = await pool.query(
    `SELECT * FROM rpc_get_period_status($1)`,
    [today]
  );
  if (!rows) throw new Error("FAILED_TO_GET_PERIOD_STATUS");
  return rows;
};

exports.closePeriod = async (year, month, closedBy, notes = null) => {
  logger.info("Closing accounting period", { year, month, closedBy });

  let rows;
  try {
    const result = await pool.query(
      `SELECT * FROM close_accounting_period($1, $2, $3, $4, $5)`,
      [year, month, closedBy, notes, true]
    );
    rows = result.rows;
  } catch (err) {
    logger.error("Failed to close period", { error: err.message });
    throw new Error(err.message || "FAILED_TO_CLOSE_PERIOD");
  }

  return rows;
};

exports.reopenPeriod = async (year, month, reopenedBy, reason) => {
  if (!reason || reason.length < 10) {
    throw new Error("REOPEN_REASON_REQUIRED_MIN_10_CHARS");
  }

  logger.info("Reopening accounting period", { year, month, reopenedBy });

  let rows;
  try {
    const result = await pool.query(
      `SELECT * FROM reopen_accounting_period($1, $2, $3, $4)`,
      [year, month, reopenedBy, reason]
    );
    rows = result.rows;
  } catch (err) {
    logger.error("Failed to reopen period", { error: err.message });
    throw new Error(err.message || "FAILED_TO_REOPEN_PERIOD");
  }

  return rows;
};

exports.generatePeriods = async (year) => {
  let rows;
  try {
    const result = await pool.query(
      `SELECT * FROM generate_accounting_periods($1)`,
      [year]
    );
    rows = result.rows;
  } catch (err) {
    throw new Error("FAILED_TO_GENERATE_PERIODS");
  }

  return { year, periodsCreated: rows };
};

exports.validatePostingDate = async (date) => {
  let rows;
  try {
    const result = await pool.query(
      `SELECT * FROM is_period_closed($1)`,
      [date]
    );
    rows = result.rows;
  } catch (err) {
    throw new Error("FAILED_TO_VALIDATE_DATE");
  }

  const isClosed = rows[0] ?? false;
  return {
    date,
    isClosed,
    canPost: !isClosed,
  };
};

exports.getPeriodStats = async (year, month) => {
  // Get period details
  const { rows: periodRows } = await pool.query(
    `SELECT * FROM accounting_periods WHERE year = $1 AND month = $2`,
    [year, month]
  );
  const period = periodRows[0] || null;
  if (!period) throw new Error("PERIOD_NOT_FOUND");

  // Get transaction counts grouped by source_type
  const { rows: txnCounts } = await pool.query(
    `SELECT source_type, COUNT(*) AS count
     FROM journal_entries
     WHERE entry_date >= $1 AND entry_date <= $2
     GROUP BY source_type`,
    [period.start_date, period.end_date]
  );

  return {
    period,
    transactionCounts: txnCounts || [],
  };
};

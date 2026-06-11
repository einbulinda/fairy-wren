const pool = require("../../config/db");

const CHEQUE_SELECT_SQL = `
  c.id, c.cheque_number, c.payee_name, c.payee_type, c.payee_id, c.amount,
  c.cheque_date, c.memo, c.status, c.transaction_type,
  c.journal_entry_id, c.cleared_at, c.voided_at, c.created_at,
  json_build_object('code', ba.code, 'name', ba.name) AS bank_account,
  json_build_object('code', da.code, 'name', da.name) AS debit_account
`;

const CHEQUE_JOIN_SQL = `
  FROM cheques c
  LEFT JOIN chart_of_accounts ba ON ba.id = c.bank_account_id
  LEFT JOIN chart_of_accounts da ON da.id = c.debit_account_id
`;

exports.findAll = async (filters = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`c.status = $${values.length}`);
    }
    if (filters.from) {
      values.push(filters.from);
      conditions.push(`c.cheque_date >= $${values.length}`);
    }
    if (filters.to) {
      values.push(filters.to);
      conditions.push(`c.cheque_date <= $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT ${CHEQUE_SELECT_SQL}
       ${CHEQUE_JOIN_SQL}
       ${where}
       ORDER BY c.cheque_date DESC, c.created_at DESC`,
      values,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findById = async (id) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${CHEQUE_SELECT_SQL}
       ${CHEQUE_JOIN_SQL}
       WHERE c.id = $1`,
      [id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findByNumber = async (chequeNumber) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, cheque_number FROM cheques WHERE cheque_number = $1`,
      [chequeNumber],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.create = async (payload) => {
  try {
    const cols = Object.keys(payload);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const { rows: inserted } = await pool.query(
      `INSERT INTO cheques (${cols.join(", ")}) VALUES (${placeholders}) RETURNING id`,
      Object.values(payload),
    );
    if (!inserted[0]) return { data: null, error: null };

    const { rows } = await pool.query(
      `SELECT ${CHEQUE_SELECT_SQL}
       ${CHEQUE_JOIN_SQL}
       WHERE c.id = $1`,
      [inserted[0].id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.updateStatus = async (id, status, extra = {}) => {
  try {
    const payload = { status, ...extra };
    const entries = Object.entries(payload);
    const set = entries.map(([col], i) => `"${col}" = $${i + 1}`).join(", ");
    await pool.query(
      `UPDATE cheques SET ${set} WHERE id = $${entries.length + 1}`,
      [...entries.map(([, v]) => v), id],
    );

    const { rows } = await pool.query(
      `SELECT ${CHEQUE_SELECT_SQL}
       ${CHEQUE_JOIN_SQL}
       WHERE c.id = $1`,
      [id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.linkJournal = async (chequeId, journalEntryId) => {
  try {
    const { rows } = await pool.query(
      `UPDATE cheques SET journal_entry_id = $1 WHERE id = $2 RETURNING *`,
      [journalEntryId, chequeId],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

const pool = require("../../config/db");

exports.findAll = async (filters = {}) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM rpc_unified_expenses($1, $2)`,
      [filters.from || null, filters.to || null],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.create = async (payload) => {
  try {
    const cols = Object.keys(payload);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `INSERT INTO expenses (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      Object.values(payload),
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.linkJournal = async (expenseId, journalEntryId) => {
  try {
    const { rows } = await pool.query(
      `UPDATE expenses SET journal_entry_id = $1 WHERE id = $2 RETURNING *`,
      [journalEntryId, expenseId],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

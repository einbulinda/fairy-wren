const pool = require("../../config/db");

exports.create = async (payload) => {
  try {
    const keys = Object.keys(payload);
    const values = Object.values(payload);
    const cols = keys.join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `INSERT INTO reservations (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findAll = async ({ status, date, limit = 50, offset = 0 } = {}) => {
  try {
    const params = [limit, offset];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (date) {
      params.push(date);
      conditions.push(`reservation_date = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM reservations
       ${where}
       ORDER BY reservation_date ASC, reservation_time ASC
       LIMIT $1 OFFSET $2`,
      params
    );
    return { data: rows, count: rows[0]?.total_count ?? 0, error: null };
  } catch (error) {
    return { data: null, count: 0, error };
  }
};

exports.findById = async (id) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM reservations WHERE id = $1",
      [id]
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.updateStatus = async (id, status) => {
  try {
    const { rows } = await pool.query(
      "UPDATE reservations SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

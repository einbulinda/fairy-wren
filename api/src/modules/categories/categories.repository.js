const pool = require("../../config/db");

exports.findAll = async (filters = {}) => {
  try {
    const conditions = [];
    const params = [];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT id, name, active, color FROM categories ${where} ORDER BY name`
    , params);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findById = async (id) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, active, color FROM categories WHERE id = $1",
      [id]
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.create = async (payload) => {
  try {
    const keys = Object.keys(payload);
    const values = Object.values(payload);
    const cols = keys.join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `INSERT INTO categories (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.update = async (id, payload) => {
  try {
    const entries = Object.entries(payload);
    const set = entries.map(([col], i) => `${col} = $${i + 1}`).join(", ");
    const values = entries.map(([, val]) => val);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE categories SET ${set} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.archive = async (id, active) => {
  try {
    const { rows } = await pool.query(
      "UPDATE categories SET active = $1 WHERE id = $2 RETURNING *",
      [active, id]
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

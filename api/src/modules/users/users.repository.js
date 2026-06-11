const pool = require("../../config/db");

exports.findAll = async (filters = {}) => {
  try {
    const conditions = [];
    const params = [];

    if (filters.active !== undefined) {
      params.push(filters.active);
      conditions.push(`active = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT id, name, role, active, created_at FROM profiles ${where} ORDER BY name`,
      params
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findById = async (id) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, role, active, created_at FROM profiles WHERE id = $1",
      [id]
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.userExists = async (fingerprint) => {
  try {
    const { rows } = await pool.query(
      "SELECT id FROM profiles WHERE pin_fingerprint = $1",
      [fingerprint]
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
      `INSERT INTO profiles (${cols}) VALUES (${placeholders}) RETURNING *`,
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
      `UPDATE profiles SET ${set} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.archive = async (id) => {
  try {
    const { rows } = await pool.query(
      "UPDATE profiles SET active = false WHERE id = $1 RETURNING *",
      [id]
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

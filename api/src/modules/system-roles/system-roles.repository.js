const pool = require("../../config/db");

exports.findAll = async () => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM system_roles ORDER BY sort_order ASC"
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findActive = async () => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM system_roles WHERE active = true ORDER BY sort_order ASC"
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findByCode = async (code) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM system_roles WHERE code = $1",
      [code]
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
      `INSERT INTO system_roles (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.update = async (code, payload) => {
  try {
    const entries = Object.entries(payload);
    const set = entries.map(([col], i) => `${col} = $${i + 1}`).join(", ");
    const values = entries.map(([, val]) => val);
    values.push(code);
    const { rows } = await pool.query(
      `UPDATE system_roles SET ${set} WHERE code = $${values.length} RETURNING *`,
      values
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.delete = async (code) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM system_roles WHERE code = $1 RETURNING *",
      [code]
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.isInUse = async (code) => {
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) AS count FROM profiles WHERE role = $1",
      [code]
    );
    return parseInt(rows[0].count, 10) > 0;
  } catch (error) {
    return false;
  }
};

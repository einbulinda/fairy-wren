const pool = require("../../config/db");

exports.findAll = async ({ activeOnly = false } = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (activeOnly) {
      conditions.push(`active = true`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM gallery_images
       ${where}
       ORDER BY sort_order ASC, created_at ASC`,
      values,
    );
    return {
      data: rows,
      count: parseInt(rows[0]?.total_count ?? 0),
      error: null,
    };
  } catch (error) {
    return { data: null, count: 0, error };
  }
};

exports.findById = async (id) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM gallery_images WHERE id = $1`,
      [id],
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
    const { rows } = await pool.query(
      `INSERT INTO gallery_images (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      Object.values(payload),
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.update = async (id, payload) => {
  try {
    const entries = Object.entries(payload);
    const set = entries.map(([col], i) => `"${col}" = $${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `UPDATE gallery_images SET ${set} WHERE id = $${entries.length + 1} RETURNING *`,
      [...entries.map(([, v]) => v), id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.remove = async (id) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM gallery_images WHERE id = $1 RETURNING *`,
      [id],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getMaxSortOrder = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT sort_order FROM gallery_images ORDER BY sort_order DESC LIMIT 1`,
    );
    return rows[0]?.sort_order ?? -1;
  } catch {
    return -1;
  }
};

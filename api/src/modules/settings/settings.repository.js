const pool = require("../../config/db");

exports.getAll = async () => {
  try {
    const { rows } = await pool.query("SELECT * FROM settings");
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getByKey = async (key) => {
  try {
    const { rows } = await pool.query(
      "SELECT value FROM settings WHERE key = $1",
      [key]
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.bulkUpsert = async (entries) => {
  try {
    const results = [];
    for (const entry of entries) {
      const { rows } = await pool.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
         RETURNING *`,
        [entry.key, entry.value]
      );
      results.push(rows[0]);
    }
    return { data: results, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

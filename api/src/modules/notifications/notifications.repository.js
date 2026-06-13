const pool = require("../../config/db");

exports.markViewed = async (userId, items) => {
  try {
    if (!items || items.length === 0) return { error: null };

    const values = items.flatMap(({ entity_type, entity_id }) => [
      userId,
      entity_type,
      entity_id,
    ]);
    const placeholders = items
      .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
      .join(", ");

    await pool.query(
      `INSERT INTO notification_views (user_id, entity_type, entity_id)
       VALUES ${placeholders}
       ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING`,
      values,
    );
    return { error: null };
  } catch (error) {
    return { error };
  }
};

exports.getViewedIds = async (userId) => {
  try {
    const { rows } = await pool.query(
      `SELECT entity_id FROM notification_views WHERE user_id = $1`,
      [userId],
    );
    return { data: rows.map((r) => r.entity_id), error: null };
  } catch (error) {
    return { data: null, error };
  }
};

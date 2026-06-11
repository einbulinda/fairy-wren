const pool = require("../../config/db");

/**
 * List payments filtered by mode and date range
 * New read-only capability
 */
exports.listPayments = async ({ type, from, to }) => {
  try {
    const conditions = [];
    const params = [];

    if (type) {
      params.push(type);
      conditions.push(`pay.payment_type = $${params.length}`);
    }

    if (from) {
      params.push(from);
      conditions.push(`pay.created_at >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      conditions.push(`pay.created_at <= $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        pay.id,
        pay.bill_id,
        pay.amount,
        pay.payment_type,
        pay.is_paid,
        pay.status,
        pay.created_at,
        json_build_object('id', u.id, 'name', u.name) AS created_by_user
      FROM payments pay
      LEFT JOIN profiles u ON u.id = pay.created_by
      ${whereClause}
      ORDER BY pay.created_at DESC
    `;

    const { rows } = await pool.query(sql, params);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

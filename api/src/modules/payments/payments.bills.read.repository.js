const pool = require("../../config/db");

exports.fetchBillsWithPayments = async (filters = {}) => {
  try {
    const conditions = [];
    const params = [];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`b.status = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        b.id, b.customer_name, b.status, b.created_at, b.updated_at,
        json_build_object('id', cu.id, 'name', cu.name) AS created_by,
        json_build_object('id', uu.id, 'name', uu.name) AS updated_by,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', pay.id,
            'amount', pay.amount,
            'payment_type', pay.payment_type,
            'created_at', pay.created_at
          )), '[]'::json)
          FROM payments pay WHERE pay.bill_id = b.id
        ) AS payments,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', r.id,
            'round_number', r.round_number,
            'round_items', (
              SELECT COALESCE(json_agg(json_build_object(
                'id', ri.id,
                'quantity', ri.quantity,
                'price', ri.price,
                'product', json_build_object('id', p.id, 'name', p.name)
              )), '[]'::json)
              FROM round_items ri
              JOIN products p ON p.id = ri.product_id
              WHERE ri.round_id = r.id
            )
          )), '[]'::json)
          FROM rounds r WHERE r.bill_id = b.id
        ) AS rounds
      FROM bills b
      LEFT JOIN profiles cu ON cu.id = b.created_by
      LEFT JOIN profiles uu ON uu.id = b.updated_by
      ${whereClause}
      ORDER BY b.created_at DESC
    `;

    const { rows } = await pool.query(sql, params);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

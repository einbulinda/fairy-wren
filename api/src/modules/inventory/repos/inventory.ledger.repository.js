const pool = require("../../../config/db");

/* ---------- INSERT LEDGER ENTRY ---------- */
exports.insertLedgerEntry = async (payload) => {
  try {
    const keys = Object.keys(payload);
    const values = Object.values(payload);
    const cols = keys.join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

    const { rows } = await pool.query(
      `INSERT INTO inventory_ledger (${cols}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- READ LEDGER ---------- */
exports.getLedger = async ({ productId, from, to }) => {
  try {
    const params = [];
    const conditions = [];
    let idx = 1;

    if (productId) {
      conditions.push(`il.product_id = $${idx++}`);
      params.push(productId);
    }
    if (from) {
      conditions.push(`il.created_at >= $${idx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`il.created_at <= $${idx++}`);
      params.push(to);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT il.*, json_build_object('name', p.name) AS products
       FROM inventory_ledger il
       LEFT JOIN products p ON p.id = il.product_id
       ${whereClause}
       ORDER BY il.created_at DESC`,
      params,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

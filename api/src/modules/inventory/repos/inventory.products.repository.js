const pool = require("../../../config/db");

/* ---------- STOCK VISIBILITY ---------- */
exports.getTrackedStock = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.unit,
        p.price,
        p.cost_price,
        p.category_id,
        json_build_object('name', c.name) AS categories,
        p.current_stock,
        p.reorder_level
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.track_inventory = true
         AND p.active = true
       ORDER BY p.name`,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- COST SNAPSHOT ---------- */
exports.getProductCostSnapshot = async (productId) => {
  try {
    const { rows } = await pool.query(
      `SELECT current_stock, name, id FROM products WHERE id = $1`,
      [productId],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- UPDATE STOCK ---------- */
exports.updateStockAndCost = async (productId, current_stock, cost_price) => {
  try {
    const { rows } = await pool.query(
      `UPDATE products SET current_stock = $1, cost_price = $2 WHERE id = $3 RETURNING *`,
      [current_stock, cost_price, productId],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

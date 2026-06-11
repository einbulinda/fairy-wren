const pool = require("../../../config/db");

/**
 * Increment or decrement stock snapshot
 */
exports.incrementStock = async (productId, quantity) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM increment_stock($1, $2)`,
      [productId, quantity],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Get stock take adjustments report
 */
exports.getStockTakeAdjustments = async (filters) => {
  try {
    const params = [];
    const conditions = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`st.approval_status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.performedById) {
      conditions.push(`st.performed_by_id = $${idx++}`);
      params.push(filters.performedById);
    }
    if (filters.startDate && filters.endDate) {
      conditions.push(`st.created_at >= $${idx++}`);
      params.push(filters.startDate);
      conditions.push(`st.created_at <= $${idx++}`);
      params.push(filters.endDate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT
        sti.*,
        json_build_object(
          'id', st.id,
          'status', st.status,
          'performed_by_id', st.performed_by_id,
          'reviewed_by_id', st.reviewed_by_id,
          'created_at', st.created_at
        ) AS stock_takes,
        json_build_object('name', p.name) AS products
       FROM stock_take_items sti
       LEFT JOIN stock_takes st ON st.id = sti.stock_take_id
       LEFT JOIN products p ON p.id = sti.product_id
       ${whereClause}`,
      params,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

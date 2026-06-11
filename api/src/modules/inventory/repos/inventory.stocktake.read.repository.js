const pool = require("../../../config/db");

/**
 * Stock take adjustment report — queries stock_takes directly
 */
exports.getStockTakeById = async (id) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        st.id,
        st.created_at,
        st.completed_at,
        st.stock_take_name,
        st.stock_take_type,
        st.approval_status,
        st.approval_notes,
        st.location,
        st.adjustments_applied,
        json_build_object('id', pr.id, 'name', pr.name, 'role', pr.role) AS profiles,
        (
          SELECT json_agg(
            json_build_object(
              'id', sti.id,
              'product_id', sti.product_id,
              'system_qty', sti.system_qty,
              'physical_qty', sti.physical_qty,
              'variance', sti.variance,
              'variance_percentage', sti.variance_percentage,
              'cost_per_unit', sti.cost_per_unit,
              'total_value_adjustment', sti.total_value_adjustment,
              'reason', sti.reason,
              'notes', sti.notes,
              'products', json_build_object('id', p.id, 'name', p.name)
            )
          )
          FROM stock_take_items sti
          LEFT JOIN products p ON p.id = sti.product_id
          WHERE sti.stock_take_id = st.id
        ) AS stock_take_items
       FROM stock_takes st
       LEFT JOIN profiles pr ON pr.id = st.performed_by_id
       WHERE st.id = $1`,
      [id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getStockTakeAdjustments = async ({ startDate, endDate }) => {
  try {
    const params = [];
    const conditions = [];
    let idx = 1;

    if (startDate) {
      conditions.push(`st.created_at >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`st.created_at <= $${idx++}`);
      params.push(endDate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT
        st.id,
        st.created_at,
        st.completed_at,
        st.stock_take_name,
        st.stock_take_type,
        st.approval_status,
        st.approval_notes,
        st.location,
        json_build_object('id', pr.id, 'name', pr.name, 'role', pr.role) AS profiles,
        (
          SELECT json_agg(
            json_build_object(
              'id', sti.id,
              'system_qty', sti.system_qty,
              'physical_qty', sti.physical_qty,
              'variance_percentage', sti.variance_percentage
            )
          )
          FROM stock_take_items sti
          WHERE sti.stock_take_id = st.id
        ) AS stock_take_items
       FROM stock_takes st
       LEFT JOIN profiles pr ON pr.id = st.performed_by_id
       ${whereClause}
       ORDER BY st.created_at DESC`,
      params,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

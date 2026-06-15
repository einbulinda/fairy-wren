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

exports.getAdjustmentInsights = async ({ startDate, endDate } = {}) => {
  try {
    const params = [];
    const conditions = ["sti.variance != 0", "st.approval_status = 'approved'"];

    if (startDate) {
      params.push(startDate);
      conditions.push(`COALESCE(st.completed_at, st.created_at) >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      conditions.push(`COALESCE(st.completed_at, st.created_at) <= $${params.length}`);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const { rows } = await pool.query(
      `SELECT
        p.id                                                              AS product_id,
        p.name                                                            AS product_name,
        p.unit,
        COUNT(*)::int                                                     AS adjustment_count,
        SUM(ABS(sti.variance))::numeric                                   AS total_abs_variance,
        ROUND(AVG(ABS(COALESCE(sti.variance_percentage, 0)))::numeric, 2) AS avg_variance_pct,
        ROUND(SUM(COALESCE(sti.total_value_adjustment, 0))::numeric, 2)   AS total_value_impact,
        json_agg(
          json_build_object(
            'stock_take_id',      st.id,
            'stock_take_name',    st.stock_take_name,
            'date',               COALESCE(st.completed_at, st.created_at),
            'variance',           sti.variance,
            'variance_percentage', COALESCE(sti.variance_percentage, 0),
            'reason',             sti.reason
          )
          ORDER BY COALESCE(st.completed_at, st.created_at)
        )                                                                 AS adjustment_history
       FROM stock_take_items sti
       JOIN products p ON p.id = sti.product_id
       JOIN stock_takes st ON st.id = sti.stock_take_id
       ${where}
       GROUP BY p.id, p.name, p.unit
       ORDER BY COUNT(*) DESC, SUM(ABS(sti.variance)) DESC`,
      params,
    );
    return { data: rows, error: null };
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

const pool = require("../../../config/db");

/* ---------- INCOMPLETE SESSIONS ---------- */
exports.getIncompleteStockTakes = async (userId) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        st.*,
        (SELECT COUNT(*) FROM stock_take_items WHERE stock_take_id = st.id) AS stock_take_items_count,
        p.name AS performed_by_name
       FROM stock_takes st
       LEFT JOIN profiles p ON p.id = st.performed_by_id
       WHERE st.approval_status = 'pending'
         AND st.completed_at IS NULL
         AND st.performed_by_id = $1
       ORDER BY st.created_at DESC`,
      [userId],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- SESSION ITEMS ---------- */
exports.getStockTakeItems = async (sessionId) => {
  try {
    const { rows } = await pool.query(
      `SELECT sti.*, p.name AS product_name
       FROM stock_take_items sti
       LEFT JOIN products p ON p.id = sti.product_id
       WHERE sti.stock_take_id = $1`,
      [sessionId],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

const pool = require("../../../config/db");

/* -------------Get all items for a bill (used during void) ----------- */
exports.getBillItems = async (billId) => {
  try {
    const { rows } = await pool.query(
      `SELECT ri.quantity, ri.product_id
       FROM round_items ri
       INNER JOIN rounds r ON r.id = ri.round_id
       WHERE r.bill_id = $1`,
      [billId],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

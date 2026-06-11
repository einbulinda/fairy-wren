const pool = require("../../../config/db");

/* ---------- CREATE SESSION ---------- */
exports.createSession = async ({
  userId,
  stockTakeName,
  stockTakeType,
  location,
}) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM create_stock_take_session($1, $2, $3, $4)`,
      [userId, stockTakeName, stockTakeType, location],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- RECORD ITEM ---------- */
exports.recordItem = async (payload) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM record_stock_take_item($1, $2, $3, $4, $5)`,
      [
        payload.stockTakeId,
        payload.productId,
        payload.physicalQty,
        payload.reason,
        payload.notes,
      ],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- COMPLETE ---------- */
exports.completeSession = async (stockTakeId, userId) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM complete_stock_take_session($1, $2)`,
      [stockTakeId, userId],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- APPROVE ---------- */
exports.approve = async (stockTakeId, reviewerId, notes) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM approve_stock_take($1, $2, $3)`,
      [stockTakeId, reviewerId, notes],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- REJECT ---------- */
exports.reject = async (stockTakeId, reviewerId, reason) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM reject_stock_take($1, $2, $3)`,
      [stockTakeId, reviewerId, reason],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

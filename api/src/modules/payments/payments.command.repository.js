const pool = require("../../config/db");

/**
 * Process a payment against a bill
 * v1: processPayment (RPC)
 */
exports.processPayment = async ({
  billId,
  userId,
  payments,
  permissions,
}) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM process_payment($1, $2::jsonb, $3, $4::jsonb)",
      [billId, JSON.stringify(payments), userId, JSON.stringify(permissions)]
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

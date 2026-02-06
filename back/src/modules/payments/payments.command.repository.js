const getSupabase = require("../../config/supabase");

/**
 * Process a payment against a bill
 * v1: processPayment (RPC)
 */
exports.processPayment = async ({
  billId,
  userId,
  paymentMode,
  amount,
  role,
}) => {
  const supabase = getSupabase();
  return supabase.rpc("process_payment", {
    p_bill_id: billId,
    p_amount: amount,
    p_payment_type: paymentMode,
    p_user_id: userId,
    p_user_role: role,
  });
};

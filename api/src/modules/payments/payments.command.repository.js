const getSupabase = require("../../config/supabase");

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
  const supabase = getSupabase();

  return await supabase.rpc("process_payment", {
    p_bill_id: billId,
    p_payments: payments,
    p_user_id: userId,
    p_user_permissions: permissions,
  });
};

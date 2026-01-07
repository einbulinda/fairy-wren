const supabase = require("../../config/supabase");

/**
 * Generic helper to call RPC safely
 */
const callRpc = async (rpcName, params) => {
  const { data, error } = await supabase.rpc(rpcName, params);
  if (error) throw error;
  return data;
};

exports.getTotalRevenue = async (startDate, endDate) => {
  return callRpc("rpc_total_revenue", {
    p_start_date: startDate,
    p_end_date: endDate,
  });
};

exports.getDailyRevenue = async (startDate, endDate) => {
  return callRpc("rpc_daily_revenue", {
    p_start_date: startDate,
    p_end_date: endDate,
  });
};

exports.getPaymentTypeSummary = async (startDate, endDate) => {
  return callRpc("rpc_payment_type_summary", {
    p_start_date: startDate,
    p_end_date: endDate,
  });
};

exports.getAverageBillValue = async (startDate, endDate) => {
  return callRpc("rpc_avg_bill_value", {
    p_start_date: startDate,
    p_end_date: endDate,
  });
};

exports.getOutstandingBills = async (startDate, endDate) => {
  return callRpc("rpc_outstanding_bills", {
    p_start_date: startDate,
    p_end_date: endDate,
  });
};

exports.getCategorySales = async (startDate, endDate) => {
  return callRpc("rpc_category_sales", {
    p_start_date: startDate,
    p_end_date: endDate,
  });
};

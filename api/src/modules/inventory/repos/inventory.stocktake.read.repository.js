const getSupabase = require("../../../config/supabase");

/**
 * Stock take adjustment report
 */
exports.getStockTakeAdjustments = async ({ startDate, endDate }) => {
  const supabase = getSupabase();

  let query = supabase.from("vw_stock_take_adjustments_report").select("*");

  if (startDate) {
    query = query.gte("createdAt", startDate);
  }

  if (endDate) {
    query = query.lte("createdAt", endDate);
  }

  return query;
};

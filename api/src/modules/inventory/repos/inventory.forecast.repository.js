const getSupabase = require("../../../config/supabase");

exports.getReorderForecast = async (lookbackDays = 14) => {
  const supabase = getSupabase();
  return supabase.rpc("get_reorder_forecast", {
    p_lookback_days: lookbackDays,
  });
};

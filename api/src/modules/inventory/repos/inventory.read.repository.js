const getSupabase = require("../../../config/supabase");

/* ---------- INCOMPLETE SESSIONS ---------- */
exports.getIncompleteStockTakes = async (userId) => {
  const supabase = getSupabase();

  return supabase
    .from("stock_takes")
    .select("*")
    .eq("status", "started")
    .eq("performed_by_id", userId);
};

/* ---------- SESSION ITEMS ---------- */
exports.getStockTakeItems = async (sessionId) => {
  const supabase = getSupabase();

  return supabase
    .from("stock_take_items")
    .select("*, products(name)")
    .eq("stock_take_id", sessionId);
};

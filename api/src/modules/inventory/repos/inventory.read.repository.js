const getSupabase = require("../../../config/supabase");

/* ---------- INCOMPLETE SESSIONS ---------- */
exports.getIncompleteStockTakes = async (userId) => {
  const supabase = getSupabase();

  return supabase
    .from("stock_takes")
    .select("*, stock_take_items(count), profiles!performed_by_id(name)")
    .eq("approval_status", "pending")
    .is("completed_at", null)
    .eq("performed_by_id", userId)
    .order("created_at", { ascending: false });
};

/* ---------- SESSION ITEMS ---------- */
exports.getStockTakeItems = async (sessionId) => {
  const supabase = getSupabase();

  return supabase
    .from("stock_take_items")
    .select("*, products(name)")
    .eq("stock_take_id", sessionId);
};

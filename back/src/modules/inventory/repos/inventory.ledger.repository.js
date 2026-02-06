const getSupabase = require("../../../config/supabase");

/* ---------- INSERT LEDGER ENTRY ---------- */
exports.insertLedgerEntry = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("inventory_ledger").insert(payload);
};

/* ---------- READ LEDGER ---------- */
exports.getLedger = async ({ productId, from, to }) => {
  const supabase = getSupabase();

  let query = supabase
    .from("inventory_ledger")
    .select("*, products(name)")
    .order("created_at", { ascending: false });

  if (productId) query = query.eq("product_id", productId);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  return query;
};

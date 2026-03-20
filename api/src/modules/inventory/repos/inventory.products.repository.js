const getSupabase = require("../../../config/supabase");

/* ---------- STOCK VISIBILITY ---------- */
exports.getTrackedStock = async () => {
  const supabase = getSupabase();

  return supabase
    .from("products")
    .select(
      `
          id,
          name,
          unit,
          cost_price,
          category_id,
          categories!products_category_id_fkey(name),
          current_stock,
          reorder_level
        `,
    )
    .eq("track_inventory", true)
    .eq("active", true)
    .order("name");
};

/* ---------- COST SNAPSHOT ---------- */
exports.getProductCostSnapshot = async (productId) => {
  const supabase = getSupabase();

  return supabase
    .from("products")
    .select("current_stock, name, id")
    .eq("id", productId)
    .single();
};

/* ---------- UPDATE STOCK ---------- */
exports.updateStockAndCost = async (productId, current_stock, cost_price) => {
  const supabase = getSupabase();

  return supabase
    .from("products")
    .update({ current_stock, cost_price })
    .eq("id", productId);
};

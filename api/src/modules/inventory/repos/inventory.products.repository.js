const getSupabase = require("../../../config/supabase");

/* ---------- STOCK VISIBILITY ---------- */
exports.getTrackedStock = async () => {
  const supabase = getSupabase();

  const [{ data: products, error: pErr }, { data: onHand, error: ohErr }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          `
          id,
          name,
          unit,
          cost_price,
          categories(name)
        `,
        )
        .eq("track_inventory", true)
        .eq("active", true)
        .order("name"),
      supabase
        .from("inventory_on_hand")
        .select("product_id, quantity_on_hand"),
    ]);

  const error = pErr || ohErr;
  if (error) return { data: null, error };

  const stockMap = Object.fromEntries(
    (onHand || []).map((r) => [r.product_id, r.quantity_on_hand]),
  );

  const data = (products || []).map((p) => ({
    ...p,
    current_stock: stockMap[p.id] ?? 0,
  }));

  return { data, error: null };
};

/* ---------- COST SNAPSHOT ---------- */
exports.getProductCostSnapshot = async (productId) => {
  const supabase = getSupabase();

  return supabase
    .from("products_with_stock")
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

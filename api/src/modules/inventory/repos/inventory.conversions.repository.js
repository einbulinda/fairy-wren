const getSupabase = require("../../../config/supabase");

exports.executeConversion = async ({
  sourceProductId,
  targetProductId,
  sourceQty,
  targetQty,
  notes,
  userId,
}) => {
  const supabase = getSupabase();
  return supabase.rpc("execute_product_conversion", {
    p_source_product_id: sourceProductId,
    p_target_product_id: targetProductId,
    p_source_qty: sourceQty,
    p_target_qty: targetQty,
    p_notes: notes || null,
    p_user_id: userId || null,
  });
};

exports.getConversionHistory = async () => {
  const supabase = getSupabase();
  return supabase
    .from("product_conversions")
    .select(
      `
      *,
      source:products!product_conversions_source_product_id_fkey(id, name, unit, volume_ml),
      target:products!product_conversions_target_product_id_fkey(id, name, unit, volume_ml),
      creator:profiles!product_conversions_created_by_fkey(name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(50);
};

exports.getConvertibleProducts = async (allowedCategoryIds = []) => {
  const supabase = getSupabase();
  let query = supabase
    .from("products")
    .select("id, name, unit, volume_ml, cost_price, current_stock, category_id, categories(name)")
    .eq("active", true)
    .eq("track_inventory", true)
    .not("volume_ml", "is", null)
    .gt("volume_ml", 0);

  if (allowedCategoryIds.length > 0) {
    query = query.in("category_id", allowedCategoryIds);
  }

  return query.order("name");
};

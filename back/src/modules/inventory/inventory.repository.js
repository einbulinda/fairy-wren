const getSupabase = require("../../config/supabase");

/**
 * Get current stock snapshot
 */
exports.getCurrentStock = async (productId) => {
  const supabase = getSupabase();
  return supabase
    .from("products")
    .select("current_stock")
    .eq("id", productId)
    .single();
};

/**
 * Increment or decrement stock snapshot
 */
exports.incrementStock = async (productId, quantity) => {
  const supabase = getSupabase();
  return supabase.rpc("increment_stock", {
    p_product_id: productId,
    p_quantity: quantity,
  });
};

/**
 * Get all items for a bill (used during void)
 */
exports.getBillItems = async (billId) => {
  const supabase = getSupabase();
  return supabase
    .from("round_items")
    .select(
      `
      quantity,
      product_id,
      round:rounds!inner(bill_id)
    `,
    )
    .eq("round.bill_id", billId);
};

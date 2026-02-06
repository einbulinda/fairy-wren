const getSupabase = require("../../../config/supabase");

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

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

/**
 * Get stock take adjustments report
 */
exports.getStockTakeAdjustments = async (filters) => {
  const supabase = getSupabase();

  let query = supabase
    .from("stock_take_items")
    .select(
      "*, stock_takes(id, status, performed_by_id, reviewed_by_id, created_at), products(name)",
    );

  if (filters.status) {
    query = query.eq("stock_takes.approval_status", filters.status);
  }

  if (filters.performedById) {
    query = query.eq("stock_takes.performed_by_id", filters.performedById);
  }

  if (filters.startDate && filters.endDate) {
    query = query
      .gte("stock_takes.created_at", filters.startDate)
      .lte("stock_takes.created_at", filters.endDate);
  }

  return query;
};

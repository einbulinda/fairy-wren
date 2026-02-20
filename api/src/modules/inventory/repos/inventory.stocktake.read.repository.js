const getSupabase = require("../../../config/supabase");

/**
 * Stock take adjustment report — queries stock_takes directly
 */
exports.getStockTakeById = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("stock_takes")
    .select(
      `id,
      created_at,
      completed_at,
      stock_take_name,
      stock_take_type,
      approval_status,
      approval_notes,
      location,
      adjustments_applied,
      profiles!performed_by_id(id, name, role),
      stock_take_items(
        id,
        product_id,
        system_qty,
        physical_qty,
        variance,
        variance_percentage,
        cost_per_unit,
        total_value_adjustment,
        reason,
        notes,
        products(id, name)
      )`,
    )
    .eq("id", id)
    .single();
};

exports.getStockTakeAdjustments = async ({ startDate, endDate }) => {
  const supabase = getSupabase();

  let query = supabase
    .from("stock_takes")
    .select(
      `id,
      created_at,
      completed_at,
      stock_take_name,
      stock_take_type,
      approval_status,
      approval_notes,
      location,
      profiles!performed_by_id(id, name, role),
      stock_take_items(id, system_qty, physical_qty, variance_percentage)`,
    )
    .order("created_at", { ascending: false });

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  return query;
};

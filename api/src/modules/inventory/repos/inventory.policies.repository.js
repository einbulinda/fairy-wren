const getSupabase = require("../../../config/supabase");

/* ---------- POLICIES ---------- */

exports.getAllPolicies = async () => {
  const supabase = getSupabase();

  return supabase
    .from("product_inventory_policies")
    .select(
      `
      *,
      products!product_inventory_policies_product_id_fkey(id, name, current_stock, track_inventory, active),
      suppliers!product_inventory_policies_primary_supplier_id_fkey(id, name)
    `,
    )
    .order("updated_at", { ascending: false });
};

exports.getPolicyByProductId = async (productId) => {
  const supabase = getSupabase();

  return supabase
    .from("product_inventory_policies")
    .select(
      `
      *,
      products!product_inventory_policies_product_id_fkey(id, name, current_stock, track_inventory),
      suppliers!product_inventory_policies_primary_supplier_id_fkey(id, name)
    `,
    )
    .eq("product_id", productId)
    .maybeSingle();
};

exports.upsertManualOverride = async (productId, reorderLevel) => {
  const supabase = getSupabase();

  // Upsert the policy with manual override
  const { data, error } = await supabase
    .from("product_inventory_policies")
    .upsert(
      {
        product_id: productId,
        reorder_level: reorderLevel,
        manual_override: true,
        source: "manual",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id" },
    )
    .select()
    .single();

  if (error) return { data: null, error };

  // Also update the products table
  const { error: prodError } = await supabase
    .from("products")
    .update({ reorder_level: reorderLevel })
    .eq("id", productId);

  if (prodError) return { data: null, error: prodError };

  return { data, error: null };
};

exports.resetOverride = async (productId) => {
  const supabase = getSupabase();

  return supabase
    .from("product_inventory_policies")
    .update({
      manual_override: false,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", productId)
    .select()
    .single();
};

/* ---------- SETTINGS ---------- */

exports.getSettings = async () => {
  const supabase = getSupabase();

  return supabase
    .from("reorder_level_settings")
    .select("*")
    .limit(1)
    .single();
};

exports.updateSettings = async (payload) => {
  const supabase = getSupabase();

  // Get existing row id
  const { data: existing } = await supabase
    .from("reorder_level_settings")
    .select("id")
    .limit(1)
    .single();

  if (!existing) {
    return supabase
      .from("reorder_level_settings")
      .insert({ ...payload, updated_at: new Date().toISOString() })
      .select()
      .single();
  }

  return supabase
    .from("reorder_level_settings")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .select()
    .single();
};

/* ---------- REFRESH ---------- */

exports.refreshAll = async () => {
  const supabase = getSupabase();
  return supabase.rpc("refresh_reorder_levels");
};

exports.refreshProduct = async (productId) => {
  const supabase = getSupabase();
  return supabase.rpc("refresh_reorder_levels", {
    p_product_ids: [productId],
  });
};

/* ---------- MOVEMENT ANALYSIS ---------- */

exports.getMovementAnalysis = async (fastDays = 30, slowDays = 90) => {
  const supabase = getSupabase();

  return supabase.rpc("get_product_movement_analysis", {
    p_fast_days: fastDays,
    p_slow_days: slowDays,
  });
};

/* ---------- ALERTS ---------- */

exports.getReorderAlerts = async () => {
  const supabase = getSupabase();

  // Fetch all tracked products with ROL set, filter in JS since
  // PostgREST can't compare two columns in a filter
  const result = await supabase
    .from("products")
    .select(
      `
      id, name, current_stock, reorder_level, cost_price, unit,
      categories!products_category_id_fkey(name)
    `,
    )
    .eq("track_inventory", true)
    .eq("active", true)
    .gt("reorder_level", 0)
    .order("current_stock", { ascending: true });

  if (result.error) return result;

  // Filter: current_stock <= reorder_level
  result.data = result.data.filter(
    (p) => p.current_stock <= p.reorder_level,
  );

  return result;
};

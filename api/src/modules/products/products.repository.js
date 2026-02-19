const getSupabase = require("../../config/supabase");

exports.findAll = async (filters = {}) => {
  const supabase = getSupabase();
  let query = supabase.from("products_with_stock").select("*");

  if (filters.active !== undefined) {
    query = query.eq("active", filters.active);
  }
  return query.order("name");
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  return supabase.from("products").select("*, categories(id, name)").eq("id", id).single();
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("products").insert(payload).select().single();
};

exports.update = async (id, payload) => {
  const supabase = getSupabase();
  return supabase.from("products").update(payload).eq("id", id).select().single();
};

exports.archive = async (id) => {
  const supabase = getSupabase();
  return supabase.from("products").update({ active: false }).eq("id", id);
};

exports.findPurchaseHistory = async (productId) => {
  const supabase = getSupabase();
  return supabase
    .from("inventory_receipt_items")
    .select(`
      id,
      quantity,
      unit_cost,
      line_total,
      created_at,
      inventory_receipts (
        id,
        invoice_number,
        purchase_date,
        status,
        suppliers ( id, name )
      )
    `)
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
};

exports.findSalesHistory = async (productId) => {
  const supabase = getSupabase();
  return supabase
    .from("round_items")
    .select(`
      id,
      quantity,
      price,
      rounds (
        id,
        round_number,
        created_at,
        bills ( id, status, created_at )
      )
    `)
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
};
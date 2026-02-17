const getSupabase = require("../../../config/supabase");

/* ---------- READ RECEIPTS ---------- */
exports.listReceipts = async () => {
  const supabase = getSupabase();
  return supabase
    .from("inventory_receipts")
    .select(
      `
      *,
      supplier:suppliers(id, name),
      items:inventory_receipt_items(
        id,
        product_id,
        quantity,
        unit_cost,
        line_total,
        product:products(id, name)
      )
    `,
    )
    .order("created_at", { ascending: false });
};

exports.getReceiptById = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("inventory_receipts")
    .select(
      `
      *,
      supplier:suppliers(id, name),
      items:inventory_receipt_items(
        id,
        product_id,
        quantity,
        unit_cost,
        line_total,
        product:products(id, name)
      )
    `,
    )
    .eq("id", id)
    .single();
};

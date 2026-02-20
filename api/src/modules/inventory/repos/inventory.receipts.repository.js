const getSupabase = require("../../../config/supabase");

/* ---------- RECEIPT HEADER ---------- */
exports.createReceipt = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("inventory_receipts").insert(payload).select().single();
};

/* ---------- RECEIPT ITEMS ---------- */
exports.createReceiptItems = async (items) => {
  const supabase = getSupabase();
  return supabase.from("inventory_receipt_items").insert(items);
};

/* ---------- RECEIPT DETAIL (READ) ---------- */
exports.getReceiptById = async (id) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("inventory_receipts")
    .select(
      `
      id,
      invoice_number,
      purchase_date,
      total_amount,
      status,
      paid_at,
      notes,
      created_at,
      supplier_id,
      inventory_receipt_items (
        id,
        quantity,
        unit_cost,
        line_total,
        products ( id, name, unit )
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error) return { data: null, error };

  if (data?.supplier_id) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("id", data.supplier_id)
      .single();
    data.supplier = supplier || null;
  }

  return { data, error: null };
};

/* ---------- MARK RECEIPT PAID ---------- */
exports.markReceiptPaid = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("inventory_receipts")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
};

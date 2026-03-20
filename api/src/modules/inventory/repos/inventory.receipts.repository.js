const getSupabase = require("../../../config/supabase");

/*----------- RECEIVE INVENTORY ----------*/
exports.receiveInventory = async (payload, userId) => {
  const supabase = getSupabase();
  const {
    supplier_id,
    invoice_number,
    purchase_date,
    total_amount,
    line_items,
  } = payload;
  const { data, error } = await supabase.rpc("receive_inventory", {
    p_supplier_id: supplier_id,
    p_invoice_number: invoice_number,
    p_purchase_date: purchase_date,
    p_total_amount: total_amount,
    p_line_items: line_items,
    p_created_by: userId,
  });

  if (error) {
    console.error("receive_inventory RPC error:", error);
    throw new Error("FAILED_TO_RECEIVE_INVENTORY");
  }
  return { data, error: null };
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

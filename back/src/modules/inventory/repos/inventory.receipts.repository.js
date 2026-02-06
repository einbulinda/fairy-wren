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

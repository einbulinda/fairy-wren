const getSupabase = require("../../config/supabase");

/* -------------Get all items for a bill (used during void) ----------- */
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

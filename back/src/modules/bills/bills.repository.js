const getSupabase = require("../../config/supabase");

/* ---------- Bills ---------- */

exports.createBill = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("bills").insert(payload).select().single();
};

exports.findBillById = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("bills")
    .select(
      `
      *,
      rounds (
        *,
        round_items (
          *,
          product:products(id, name, price)
        )
      )
    `,
    )
    .eq("id", billId)
    .single();
};

exports.listBills = async (filters = {}) => {
  const supabase = getSupabase();
  let query = supabase.from("bills").select(
    `
      id,
      customer_name,
      status,
      created_at,
      updated_at,
      created_by_user:profiles!bills_created_by_fkey(id, name),
      updated_by_user:profiles!fk_bills_updated_by(id, name),
      rounds (
        id,
        round_number,
        round_items (
          id,
          quantity,
          price,
          product:products(id, name)
        )
      )
    `,
  );

  if (filters.status) query = query.eq("status", filters.status);

  return query.order("created_at", { ascending: false });
};

exports.updateBillStatus = async (id, status, userId) => {
  const supabase = getSupabase();
  return supabase
    .from("bills")
    .update({ status, updated_by: userId })
    .eq("id", id)
    .select()
    .single();
};

/* ---------- Rounds ---------- */
exports.createRound = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("rounds").insert(payload).select().single();
};

exports.insertRoundItems = async (items) => {
  const supabase = getSupabase();
  return supabase.from("round_items").insert(items);
};

exports.getNextRoundNumber = async (billId) => {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("rounds")
    .select("round_number")
    .eq("bill_id", billId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? data.round_number + 1 : 1;
};

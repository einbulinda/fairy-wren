const getSupabase = require("../../config/supabase");

/* ---------- Bills ---------- */

exports.createBill = async (payload) => {
  const supabase = getSupabase();
  const result = await supabase
    .from("bills")
    .insert(payload)
    .select(
      `
      id,
      customer_name,
      status,
      created_at,
      updated_at,
      created_by,
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
    )
    .single();

  // Ensure rounds array exists
  if (result.data && !result.data.rounds) {
    result.data.rounds = [];
  }

  return result;
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
          product:products(id, name, price, cost_price)
        )
      )
    `,
    )
    .eq("id", id)
    .single();
};

exports.listBills = async (filters = {}) => {
  const supabase = getSupabase();

  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(filters.limit) || 50));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("bills").select(
    `
      id,
      customer_name,
      status,
      created_at,
      updated_at,
      created_by_user:profiles!bills_created_by_fkey(id, name),
      updated_by_user:profiles!bills_updated_by_fkey(id, name),
      rounds (
        id,
        round_number,
        created_at,
        round_items (
          id,
          quantity,
          price,
          is_return,
          is_exchanged,
          inventory_posted,
          product:products(id, name, cost_price)
        )
      ),
      payments (
        id,
        amount,
        payment_type,
        status,
        is_paid,
        created_at
      )
    `,
    { count: "exact" },
  );

  // Filter by active (open + awaiting_confirmation) or by specific status(es)
  if (filters.active === "true" || filters.active === true) {
    query = query.in("status", ["open", "awaiting_confirmation"]);
  } else if (filters.status) {
    const statuses = filters.status.split(",").map((s) => s.trim());
    if (statuses.length === 1) {
      query = query.eq("status", statuses[0]);
    } else {
      query = query.in("status", statuses);
    }
  }

  if (filters.startDate) query = query.gte("created_at", filters.startDate);
  if (filters.endDate)
    query = query.lte("created_at", filters.endDate + "T23:59:59");

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  return {
    data,
    error,
    count,
    pagination: { page, limit, total: count, totalPages: Math.ceil((count || 0) / limit) },
  };
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

/* ---------- Stats ---------- */
exports.listBillsByUser = async (userId, startDate, endDate) => {
  const supabase = getSupabase();
  return supabase
    .from("bills")
    .select(
      `
      id,
      status,
      created_at,
      rounds (
        id,
        round_items (
          quantity,
          price
        )
      )
    `,
    )
    .eq("created_by", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false });
};

/* ---------- Sale Posting RPCs ---------- */
exports.postRoundSale = async (roundId) => {
  const supabase = getSupabase();
  return supabase.rpc("post_round_sale", { p_round_id: roundId });
};

exports.reverseBillSale = async (billId) => {
  const supabase = getSupabase();
  return supabase.rpc("reverse_bill_sale", { p_bill_id: billId });
};

exports.findRoundItemById = async (roundItemId) => {
  const supabase = getSupabase();
  return supabase
    .from("round_items")
    .select(`
      id, product_id, quantity, price, inventory_posted, is_exchanged,
      round:rounds!inner(id, bill_id, created_at)
    `)
    .eq("id", roundItemId)
    .single();
};

exports.reverseRoundItem = async (roundItemId, returnedQuantity) => {
  const supabase = getSupabase();
  return supabase.rpc("reverse_round_item", {
    p_round_item_id: roundItemId,
    p_returned_quantity: returnedQuantity,
  });
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

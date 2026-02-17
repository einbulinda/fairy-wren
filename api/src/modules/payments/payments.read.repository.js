const getSupabase = require("../../config/supabase");

/**
 * List payments filtered by mode and date range
 * New read-only capability
 */
exports.listPayments = async ({ type, from, to }) => {
  const supabase = getSupabase();

  let query = supabase
    .from("payments")
    .select(
      `
      id,
      bill_id,
      amount,
      payment_type,
      is_paid,
      status,
      created_at,
      created_by_user:profiles!fk_payments_created_by(
        id,
        name
      )
      `,
    )
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("payment_type", type);
  }

  if (from) {
    query = query.gte("created_at", from);
  }

  if (to) {
    query = query.lte("created_at", to);
  }

  return query;
};

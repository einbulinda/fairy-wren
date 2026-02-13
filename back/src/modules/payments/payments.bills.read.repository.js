const getSupabase = require("../../config/supabase");

exports.fetchBillsWithPayments = async (filters = {}) => {
  const supabase = getSupabase();

  query = supabase.from("bills").select(
    `
      id,
      customer_name,
      status,
      created_at,
      updated_at,
      created_by:profiles!bills_created_by_fkey(id, name),
      updated_by:profiles!fk_bills_updated_by(id, name),
      payments (
        id,
        amount,
        payment_type,
        created_at
      ),
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

  if (filters.status) query.eq("status", filters.status);

  return query.order("created_at", { ascending: false });
};

const getSupabase = require("../../config/supabase");

exports.fetchBillsWithPayments = async () => {
  const supabase = getSupabase();

  return supabase
    .from("bills")
    .select(
      `
      id,
      customer_name,
      status,
      created_at,
      updated_at,
      created_by_user:profiles!bills_created_by_fkey(id, name),
      updated_by_user:profiles!fk_bills_updated_by(id, name),
      payments (
        id,
        amount,
        payment_mode,
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
    )
    .order("created_at", { ascending: false });
};

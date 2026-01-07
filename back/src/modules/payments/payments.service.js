const supabase = require("../../config/supabase");

/**
 * Fetch bills with associated payments
 */

exports.fetchBillsWithPayments = async () => {
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      id,
      customer_name,
      status,
      subtotal,
      tax,
      total,
      created_at,
      updated_at,
      payments (
        id,
        amount,
        payment_type,
        is_paid,
        mpesa_code,
        created_at
      ),created_by_user:profiles!bills_created_by_fkey(id, name),
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
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bills with payments", error);
    throw error;
  }

  return data ?? [];
};

/**
 * Confirm bill and mark payments as paid
 */
exports.confirmBill = async ({ billId, userId, paymentMode }) => {
  const { error } = await supabase.rpc("confirm_bill_and_payments", {
    p_bill_id: billId,
    p_user_id: userId,
    p_payment_mode: paymentMode,
  });

  if (error) {
    console.error("Failed to confirm bill", error);
    throw error;
  }

  return true;
};

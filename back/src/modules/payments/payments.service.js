const supabase = require("../../config/supabase");
const { postBillToLedger } = require("../ledger/ledger.service");
const logger = require("../../utils/logger");

/**
 * Fetch bills with associated payments
 */

exports.fetchBillsWithPayments = async () => {
  logger.info("Fetching bills with payments");
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
        created_at,
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
    logger.error("Error fetching bills with payments", { error });
    // throw error;
  }

  logger.info("Fetched bills with payments", { count: data?.length ?? 0 });
  return data ?? [];
};

/**
 * Process Payments
 */
exports.processPayment = async ({
  billId,
  userId,
  paymentMode,
  amount,
  role,
}) => {
  try {
    logger.info("Confirming bill", { billId, userId, paymentMode, amount });

    const { data, error } = await supabase.rpc("process_payment", {
      p_bill_id: billId,
      p_amount: amount,
      p_payment_type: paymentMode,
      p_user_id: userId,
      p_user_role: role,
    });

    if (error) {
      logger.error("Error processing payment", {
        error,
        billId,
        userId,
        paymentMode,
        amount,
      });
      throw new Error(error.message);
    }

    logger.info("Payment processed successfully", {
      billId,
      userId,
      paymentMode,
      amount,
    });
    return data;
  } catch (error) {
    logger.error("Error processing payment", {
      billId,
      userId,
      paymentMode,
      amount,
      error,
    });
    throw new Error("Payment processing failed");
  }
};

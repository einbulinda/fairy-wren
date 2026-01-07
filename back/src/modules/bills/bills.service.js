const supabase = require("../../config/supabase");

/* ---------------- CREATE BILL ---------------- */
exports.createBill = async ({ customer_name, created_by }) => {
  const { data, error } = await supabase
    .from("bills")
    .insert({
      customer_name,
      created_by,
      status: "open",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/* ---------------- ADD ROUND ---------------- */
exports.addRound = async ({ billId, items, userId }) => {
  /**
   * 1. Validate stock availability
   */
  for (const item of items) {
    const { data: product, error } = await supabase
      .from("products")
      .select("current_stock")
      .eq("id", item.productId)
      .single();

    if (error) throw error;

    if (product.current_stock < item.quantity) {
      throw new Error(`Insufficient stock for product ${item.productId}`);
    }
  }

  /**
   * 2. Determine next round number for the bill
   */ const { data: lastRound, error: lastRoundError } = await supabase
    .from("rounds")
    .select("round_number")
    .eq("bill_id", billId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRoundError) throw lastRoundError;

  const nextRoundNumber = lastRound ? lastRound.round_number + 1 : 1;

  /**
   * 3. Create round
   */
  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({
      bill_id: billId,
      round_number: nextRoundNumber,
      created_by: userId,
    })
    .select()
    .single();

  if (roundError) throw roundError;

  /**
   * 4. Insert round items
   */
  const roundItems = items.map((item) => ({
    round_id: round.id,
    product_id: item.productId,
    price: item.price,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("round_items")
    .insert(roundItems);

  if (itemsError) throw itemsError;

  /**
   *  4. Deduct inventory (ledger + snapshot)
   */
  for (const item of items) {
    await supabase.from("inventory_ledger").insert({
      product_id: item.productId,
      transaction_type: "SALE",
      quantity: -item.quantity,
      reference_id: billId,
      created_by: userId,
    });

    await supabase.rpc("increment_stock", {
      p_product_id: item.productId,
      p_quantity: -item.quantity,
    });
  }

  return { round, items: roundItems };
};

/* ---------------- PAY BILL ---------------- */
exports.payBill = async ({ billId, amount, paymentMethod, userId }) => {
  await supabase
    .from("bills")
    .update({
      status: "awaiting_confirmation",
      updated_by: userId,
    })
    .eq("id", billId);

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      bill_id: billId,
      amount,
      payment_type: paymentMethod,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return payment;
};

/* ---------------- CONFIRM PAYMENT ---------------- */
exports.confirmPayment = async ({ paymentId, userId }) => {
  const { error } = await supabase
    .from("payments")
    .update({
      is_paid: true,
      updated_by: userId,
    })
    .eq("id", paymentId);

  if (error) throw error;
};

/* ---------------- OPEN BILLS ---------------- */
exports.getOpenBills = async () => {
  const { data, error } = await supabase
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
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
};

/* ---------------- BILL BY ID ---------------- */

exports.getBillById = async (billId) => {
  const { data, error } = await supabase
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
    `
    )
    .eq("id", billId)
    .single();

  if (error) throw error;
  return data;
};

/* ---------------- ALL BILLS ---------------- */

exports.getAllBills = async () => {
  const { data, error } = await supabase
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

  if (error) throw error;
  return data;
};

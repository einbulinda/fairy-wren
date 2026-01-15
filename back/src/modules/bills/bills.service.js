const supabase = require("../../config/supabase");
const logger = require("../../utils/logger");

/* ---------------- CREATE BILL ---------------- */
exports.createBill = async ({ customer_name, created_by }) => {
  logger.info("Creating Bill", { customer_name, created_by });
  const { data, error } = await supabase
    .from("bills")
    .insert({
      customer_name,
      created_by,
      status: "open",
    })
    .select()
    .single();

  logger.error("Database error creating bill", {
    customer_name,
    created_by,
    error,
  });

  if (error) throw error;

  logger.info("Bill created successfully", {
    billId: data.id,
  });
  return data;
};

/* ---------------- ADD ROUND ---------------- */
exports.addRound = async ({ billId, items, userId }) => {
  logger.info("Starting add round operation", {
    billId,
    userId,
  });

  /* 1. Validate stock availability */

  for (const item of items) {
    const { data: product, error } = await supabase
      .from("products")
      .select("current_stock")
      .eq("id", item.id)
      .single();

    logger.error("Failed to fetch product stock", {
      billId,
      productId: item.id,
      error,
    });

    if (error) throw error;

    if (product.current_stock < item.quantity) {
      logger.warn("Insufficient stock detected", {
        billId,
        productId: item.id,
        requested: item.quantity,
        available: product.current_stock,
      });

      throw new Error(`Insufficient stock for product ${item.productId}`);
    }
  }

  /**
   * 2. Determine next round number for the bill
   */

  const { data: lastRound, error: lastRoundError } = await supabase
    .from("rounds")
    .select("round_number")
    .eq("bill_id", billId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRoundError) {
    logger.error("Failed to resolve last round", {
      billId,
      error: lastRoundError,
    });
    throw lastRoundError;
  }

  const nextRoundNumber = lastRound ? lastRound.round_number + 1 : 1;

  logger.debug("Next round number determined", {
    billId,
    nextRoundNumber,
  });

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

  if (roundError) {
    logger.error("Failed to create round", {
      billId,
      nextRoundNumber,
      error: roundError,
    });
    throw roundError;
  }

  logger.info("Round created", {
    billId,
    roundId: round.id,
  });

  /**
   * 4. Insert round items
   */
  const roundItems = items.map((item) => ({
    round_id: round.id,
    product_id: item.id,
    price: item.price,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("round_items")
    .insert(roundItems);

  if (itemsError) {
    logger.error("Failed to insert round items", {
      billId,
      roundId: round.id,
      error: itemsError,
    });

    throw itemsError;
  }

  /**
   *  4. Deduct inventory (ledger + snapshot)
   */

  for (const item of items) {
    await supabase.from("inventory_ledger").insert({
      product_id: item.id,
      transaction_type: "SALE",
      quantity: -item.quantity,
      reference_id: billId,
      created_by: userId,
    });

    await supabase.rpc("increment_stock", {
      p_product_id: item.id,
      p_quantity: -item.quantity,
    });
  }

  logger.info("Round completed successfully", {
    billId,
    roundId: round.id,
  });

  return { round, items: roundItems };
};

/* ---------------- OPEN BILLS ---------------- */
exports.getOpenBills = async () => {
  logger.info("Getting Open Bills");
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

  if (error) {
    logger.error("Database Error getting open bills", { error });
    throw error;
  }

  return data;
};

/* ---------------- BILL BY ID ---------------- */

exports.getBillById = async (billId) => {
  logger.info("Getting Open Bills", { billId });
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

  if (error) {
    logger.error("Database error getting a Bill", { billId, error });
    throw error;
  }

  logger.info("Getting bill by ID successful", { billId });
  return data;
};

/* ---------------- ALL BILLS ---------------- */

exports.getAllBills = async () => {
  logger.info("Getting All Bills");
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

  if (error) {
    logger.error("Database error getting all bills", { error });
    throw error;
  }

  logger.info("Getting bill by ID successful");
  return data;
};

/* ---------------- VOID BILL ---------------- */
/* ---------------- VOID BILL ---------------- */
exports.voidBill = async ({ billId, userId }) => {
  logger.info("Starting bill void operation", {
    billId,
    userId,
  });

  /**
   * 1. Fetch bill and validate status
   */
  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select("id, status")
    .eq("id", billId)
    .single();

  if (billError) {
    logger.error("Failed to fetch bill for voiding", {
      billId,
      error: billError,
    });
    throw billError;
  }

  if (bill.status !== "open") {
    logger.warn("Attempt to void non-open bill blocked", {
      billId,
      currentStatus: bill.status,
    });
    throw new Error("Only open bills can be voided");
  }

  /**
   * 2. Fetch all round items (may be empty)
   */
  const { data: itemsData, error: itemsError } = await supabase
    .from("round_items")
    .select(
      `
      id,
      quantity,
      product_id,
      round:rounds!inner(
        id,
        bill_id
      )
    `
    )
    .eq("round.bill_id", billId);

  if (itemsError) {
    logger.error("Failed to fetch round items for bill void", {
      billId,
      error: itemsError,
    });
    throw itemsError;
  }

  // Defensive normalization
  const roundItems = Array.isArray(itemsData) ? itemsData : [];

  if (roundItems.length === 0) {
    logger.info("No rounds found for bill; skipping inventory reversal", {
      billId,
    });
  }

  /**
   * 3. Restore inventory (ledger + stock snapshot)
   */
  for (const item of roundItems) {
    // Ledger reversal entry
    const { error: ledgerError } = await supabase
      .from("inventory_ledger")
      .insert({
        product_id: item.product_id,
        transaction_type: "VOID_REVERSAL",
        quantity: item.quantity,
        reference_id: billId,
        created_by: userId,
      });

    if (ledgerError) {
      logger.error("Failed to insert inventory reversal ledger", {
        billId,
        productId: item.product_id,
        error: ledgerError,
      });
      throw ledgerError;
    }

    // Restore stock snapshot
    const { error: stockError } = await supabase.rpc("increment_stock", {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });

    if (stockError) {
      logger.error("Failed to restore product stock", {
        billId,
        productId: item.product_id,
        error: stockError,
      });
      throw stockError;
    }
  }

  /**
   * 4. Mark bill as void
   */
  const { error: voidError } = await supabase
    .from("bills")
    .update({
      status: "void",
      updated_by: userId,
    })
    .eq("id", billId);

  if (voidError) {
    logger.error("Failed to mark bill as void", {
      billId,
      error: voidError,
    });
    throw voidError;
  }

  logger.info("Bill voided successfully", {
    billId,
    reversedItems: roundItems.length,
  });

  return {
    billId,
    status: "void",
    reversedItems: roundItems.length,
  };
};

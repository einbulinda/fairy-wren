const supabase = require("../../config/supabase");
const logger = require("../../utils/logger");

/* ---------------- STOCK ---------------- */

exports.getStock = async () => {
  logger.info("Fetching active tracked stock");

  const { data, error } = await supabase
    .from("products")
    .select("id,name,unit,current_stock,cost_price, categories(name)")
    .eq("track_inventory", true)
    .eq("active", true)
    .order("name");

  if (error) {
    logger.error("Failed to fetch stock", { error });
    throw error;
  }

  return data;
};

/* ---------------- RESTOCK ---------------- */

exports.restock = async ({ productId, quantity, unitCost, userId, notes }) => {
  logger.info("Restock initiated", { productId, quantity, unitCost, userId });

  if (quantity <= 0) {
    logger.warn("Invalid restock quantity", { productId, quantity });
    throw new Error("Quantity must be positive");
  }

  const { data: product, error } = await supabase
    .from("products")
    .select("current_stock, cost_price")
    .eq("id", productId)
    .single();

  if (error || !product) {
    logger.error("Product not found during restock", { productId, error });
    throw new Error("Product not found");
  }

  const currentStock = Number(product.current_stock);
  const currentCost = Number(product.cost_price || 0);

  const newAvgCost =
    (currentStock * currentCost + quantity * unitCost) /
    (currentStock + quantity);

  await supabase.from("inventory_ledger").insert({
    product_id: productId,
    transaction_type: "RESTOCK",
    quantity,
    unit_cost: unitCost,
    notes,
    created_by: userId,
  });

  await supabase
    .from("products")
    .update({
      current_stock: currentStock + quantity,
      cost_price: newAvgCost,
    })
    .eq("id", productId);

  logger.info("Restock completed", {
    productId,
    newStock: currentStock + quantity,
    newAvgCost,
  });
};

/* ---------------- STOCK TAKE ---------------- */

exports.createStockTake = async (userId) => {
  logger.info("Creating stock take", { userId });

  const { data, error } = await supabase
    .from("stock_takes")
    .insert({ performed_by: userId })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create stock take", { error });
    throw error;
  }

  return data;
};

exports.saveStockTakeItems = async (stockTakeId, items) => {
  logger.info("Saving stock take items", {
    stockTakeId,
    itemCount: items.length,
  });

  const records = items.map((i) => ({
    stock_take_id: stockTakeId,
    product_id: i.productId,
    system_qty: i.systemQty,
    physical_qty: i.physicalQty,
    variance: i.physicalQty - i.systemQty,
  }));

  const { error } = await supabase.from("stock_take_items").upsert(records, {
    onConflict: "stock_take_id,product_id",
  });

  if (error) {
    logger.error("Failed to save stock take items", { stockTakeId, error });
    throw error;
  }
};

exports.completeStockTake = async (stockTakeId, userId) => {
  logger.info("Completing stock take", { stockTakeId, userId });

  const { data: items, error } = await supabase
    .from("stock_take_items")
    .select("*")
    .eq("stock_take_id", stockTakeId);

  if (error) {
    logger.error("Failed to fetch stock take items", { stockTakeId, error });
    throw error;
  }

  for (const item of items) {
    if (item.variance !== 0) {
      logger.info("Applying stock take adjustment", {
        stockTakeId,
        productId: item.product_id,
        variance: item.variance,
      });

      await supabase.from("inventory_ledger").insert({
        product_id: item.product_id,
        transaction_type: "STOCKTAKE_ADJUSTMENT",
        quantity: item.variance,
        reference_id: stockTakeId,
        created_by: userId,
      });

      await supabase
        .from("products")
        .update({
          current_stock: item.physical_qty,
        })
        .eq("id", item.product_id);
    }
  }

  await supabase
    .from("stock_takes")
    .update({ status: "completed", completed_at: new Date() })
    .eq("id", stockTakeId);

  logger.info("Stock take completed and locked", { stockTakeId });
};

exports.getStockTakeAdjustments = async ({ startDate, endDate }) => {
  logger.info("Fetching stock take adjustments", { startDate, endDate });

  let query = supabase.from("vw_stock_take_adjustments_report").select("*");

  if (startDate) {
    query = query.gte("createdAt", startDate);
  }

  if (endDate) {
    query = query.lte("createdAt", endDate);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Failed to fetch stock take ledger", { error });
    throw error;
  }
  return data
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((record) => {
      return { ...record, createdAt: new Date(record.createdAt) };
    });
};

/* ---------------- RPC STOCK TAKE ---------------- */

exports.createStockTakeSession = async ({
  userId,
  stockTakeName,
  stockTakeType = "full",
  location,
}) => {
  logger.info("Creating stock take session", {
    userId,
    stockTakeName,
    stockTakeType,
    location,
  });

  const { data, error } = await supabase.rpc("create_stock_take_session", {
    p_performed_by_id: userId,
    p_stock_take_name: stockTakeName,
    p_stock_take_type: stockTakeType,
    p_location: location,
  });

  if (error) {
    logger.error("Failed to create stock take session", { error });
    throw error;
  }

  return { stockTakeId: data };
};

exports.recordStockTakeItem = async (payload) => {
  logger.info("Recording stock take item", payload);

  const { data, error } = await supabase.rpc("record_stock_take_item", {
    p_stock_take_id: payload.stockTakeId,
    p_product_id: payload.productId,
    p_physical_qty: payload.physicalQty,
    p_reason: payload.reason,
    p_notes: payload.notes,
    p_batch_number: payload.batchNumber,
  });

  if (error) {
    logger.error("Failed to record stock take item", { error, payload });
    throw error;
  }

  return data;
};

exports.completeStockTakeSession = async (stockTakeId, userId) => {
  logger.info("Completing stock take session", { stockTakeId, userId });

  const { data, error } = await supabase.rpc("complete_stock_take_session", {
    p_stock_take_id: stockTakeId,
    p_completed_by_id: userId,
  });

  if (error) {
    logger.error("Failed to complete stock take session", { error });
    throw error;
  }

  return data;
};

exports.approveStockTake = async (stockTakeId, reviewerId, notes) => {
  logger.info("Approving stock take", { stockTakeId, reviewerId });

  const { data, error } = await supabase.rpc("approve_stock_take", {
    p_stock_take_id: stockTakeId,
    p_reviewed_by_id: reviewerId,
    p_approval_notes: notes,
  });

  if (error) {
    logger.error("Stock take approval failed", { stockTakeId, error });
    throw error;
  }

  return data;
};

exports.rejectStockTake = async (stockTakeId, reviewerId, reason) => {
  logger.info("Rejecting stock take", { stockTakeId, reviewerId });

  const { data, error } = await supabase.rpc("reject_stock_take", {
    p_stock_take_id: stockTakeId,
    p_reviewed_by_id: reviewerId,
    p_rejection_reason: reason,
  });

  if (error) {
    logger.error("Stock take rejection failed", { stockTakeId, error });
    throw error;
  }

  return data;
};

exports.recordStockTakeItem = async (payload) => {
  logger.info("Recording stock take item", payload);
  const { data, error } = await supabase.rpc("record_stock_take_item", {
    p_stock_take_id: payload.stockTakeId,
    p_product_id: payload.productId,
    p_physical_qty: payload.physicalQty,
    p_reason: payload.reason,
    p_notes: payload.notes,
  });
  if (error) {
    logger.error("Failed to record stock take item", { error, payload });
    throw error;
  }
  return data;
};

exports.completeStockTakeSession = async (stockTakeId, userId) => {
  logger.info("Completing stock take session", { stockTakeId, userId });
  const { data, error } = await supabase.rpc("complete_stock_take_session", {
    p_stock_take_id: stockTakeId,
    p_completed_by_id: userId,
  });
  if (error) {
    logger.error("Failed to complete stock take session", { error });
    throw error;
  }
  return data;
};

exports.getIncompleteStockTakes = async (userId) => {
  logger.info("Fetching incomplete stock take sessions");
  const { data, error } = await supabase
    .from("stock_takes")
    .select("*")
    .eq("status", "started")
    .eq("performed_by_id", userId);
  if (error) {
    logger.error("Failed to fetch incomplete stock take sessions", { error });
    throw error;
  }
  return data;
};

exports.getStockTakeItems = async (sessionId) => {
  logger.info("Fetching stock take items", { sessionId });
  const { data, error } = await supabase
    .from("stock_take_items")
    .select("*, products(name)")
    .eq("stock_take_id", sessionId);
  if (error) {
    logger.error("Failed to fetch stock take items", { sessionId, error });
    throw error;
  }

  return (data || []).map(({ products, ...item }) => ({
    ...item,
    product_name: products?.name ?? null,
  }));
};

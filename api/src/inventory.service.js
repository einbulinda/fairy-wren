const pool = require("./config/db");
const logger = require("./utils/logger");

/* ---------------- STOCK ---------------- */

exports.getStock = async () => {
  logger.info("Fetching active tracked stock");

  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.unit, p.current_stock, p.cost_price,
              json_build_object('name', c.name) AS categories
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.track_inventory = true AND p.active = true
       ORDER BY p.name`,
    );
    return rows;
  } catch (error) {
    logger.error("Failed to fetch stock", { error });
    throw error;
  }
};

/* ---------------- RESTOCK ---------------- */

exports.restock = async ({ productId, quantity, unitCost, userId, notes }) => {
  logger.info("Restock initiated", { productId, quantity, unitCost, userId });

  if (quantity <= 0) {
    logger.warn("Invalid restock quantity", { productId, quantity });
    throw new Error("Quantity must be positive");
  }

  let product;
  try {
    const { rows } = await pool.query(
      `SELECT current_stock, cost_price FROM products WHERE id = $1`,
      [productId],
    );
    product = rows[0];
  } catch (error) {
    logger.error("Product not found during restock", { productId, error });
    throw new Error("Product not found");
  }

  if (!product) {
    logger.error("Product not found during restock", { productId });
    throw new Error("Product not found");
  }

  const currentStock = Number(product.current_stock);
  const currentCost = Number(product.cost_price || 0);

  const newAvgCost =
    (currentStock * currentCost + quantity * unitCost) /
    (currentStock + quantity);

  await pool.query(
    `INSERT INTO inventory_ledger (product_id, transaction_type, quantity, unit_cost, notes, created_by)
     VALUES ($1, 'RESTOCK', $2, $3, $4, $5)`,
    [productId, quantity, unitCost, notes, userId],
  );

  await pool.query(
    `UPDATE products SET current_stock = $1, cost_price = $2 WHERE id = $3`,
    [currentStock + quantity, newAvgCost, productId],
  );

  logger.info("Restock completed", {
    productId,
    newStock: currentStock + quantity,
    newAvgCost,
  });
};

/* ---------------- STOCK TAKE ---------------- */

exports.createStockTake = async (userId) => {
  logger.info("Creating stock take", { userId });

  try {
    const { rows } = await pool.query(
      `INSERT INTO stock_takes (performed_by) VALUES ($1) RETURNING *`,
      [userId],
    );
    return rows[0];
  } catch (error) {
    logger.error("Failed to create stock take", { error });
    throw error;
  }
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

  try {
    for (const record of records) {
      await pool.query(
        `INSERT INTO stock_take_items (stock_take_id, product_id, system_qty, physical_qty, variance)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (stock_take_id, product_id) DO UPDATE SET
           system_qty = EXCLUDED.system_qty,
           physical_qty = EXCLUDED.physical_qty,
           variance = EXCLUDED.variance`,
        [
          record.stock_take_id,
          record.product_id,
          record.system_qty,
          record.physical_qty,
          record.variance,
        ],
      );
    }
  } catch (error) {
    logger.error("Failed to save stock take items", { stockTakeId, error });
    throw error;
  }
};

exports.completeStockTake = async (stockTakeId, userId) => {
  logger.info("Completing stock take", { stockTakeId, userId });

  let items;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM stock_take_items WHERE stock_take_id = $1`,
      [stockTakeId],
    );
    items = rows;
  } catch (error) {
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

      await pool.query(
        `INSERT INTO inventory_ledger (product_id, transaction_type, quantity, reference_id, created_by)
         VALUES ($1, 'STOCKTAKE_ADJUSTMENT', $2, $3, $4)`,
        [item.product_id, item.variance, stockTakeId, userId],
      );

      await pool.query(
        `UPDATE products SET current_stock = $1 WHERE id = $2`,
        [item.physical_qty, item.product_id],
      );
    }
  }

  await pool.query(
    `UPDATE stock_takes SET status = 'completed', completed_at = NOW() WHERE id = $1`,
    [stockTakeId],
  );

  logger.info("Stock take completed and locked", { stockTakeId });
};

exports.getStockTakeAdjustments = async ({ startDate, endDate }) => {
  logger.info("Fetching stock take adjustments", { startDate, endDate });

  try {
    const params = [];
    const conditions = [];
    let idx = 1;

    if (startDate) {
      conditions.push(`"createdAt" >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`"createdAt" <= $${idx++}`);
      params.push(endDate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT * FROM vw_stock_take_adjustments_report ${whereClause}`,
      params,
    );

    return rows
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((record) => ({ ...record, createdAt: new Date(record.createdAt) }));
  } catch (error) {
    logger.error("Failed to fetch stock take ledger", { error });
    throw error;
  }
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

  try {
    const { rows } = await pool.query(
      `SELECT * FROM create_stock_take_session($1, $2, $3, $4)`,
      [userId, stockTakeName, stockTakeType, location],
    );
    return { stockTakeId: rows[0] };
  } catch (error) {
    logger.error("Failed to create stock take session", { error });
    throw error;
  }
};

exports.recordStockTakeItem = async (payload) => {
  logger.info("Recording stock take item", payload);

  try {
    const { rows } = await pool.query(
      `SELECT * FROM record_stock_take_item($1, $2, $3, $4, $5, $6)`,
      [
        payload.stockTakeId,
        payload.productId,
        payload.physicalQty,
        payload.reason,
        payload.notes,
        payload.batchNumber,
      ],
    );
    return rows[0] || null;
  } catch (error) {
    logger.error("Failed to record stock take item", { error, payload });
    throw error;
  }
};

exports.completeStockTakeSession = async (stockTakeId, userId) => {
  logger.info("Completing stock take session", { stockTakeId, userId });

  try {
    const { rows } = await pool.query(
      `SELECT * FROM complete_stock_take_session($1, $2)`,
      [stockTakeId, userId],
    );
    return rows[0] || null;
  } catch (error) {
    logger.error("Failed to complete stock take session", { error });
    throw error;
  }
};

exports.approveStockTake = async (stockTakeId, reviewerId, notes) => {
  logger.info("Approving stock take", { stockTakeId, reviewerId });

  try {
    const { rows } = await pool.query(
      `SELECT * FROM approve_stock_take($1, $2, $3)`,
      [stockTakeId, reviewerId, notes],
    );
    return rows[0] || null;
  } catch (error) {
    logger.error("Stock take approval failed", { stockTakeId, error });
    throw error;
  }
};

exports.rejectStockTake = async (stockTakeId, reviewerId, reason) => {
  logger.info("Rejecting stock take", { stockTakeId, reviewerId });

  try {
    const { rows } = await pool.query(
      `SELECT * FROM reject_stock_take($1, $2, $3)`,
      [stockTakeId, reviewerId, reason],
    );
    return rows[0] || null;
  } catch (error) {
    logger.error("Stock take rejection failed", { stockTakeId, error });
    throw error;
  }
};

exports.getIncompleteStockTakes = async (userId) => {
  logger.info("Fetching incomplete stock take sessions");

  try {
    const { rows } = await pool.query(
      `SELECT * FROM stock_takes WHERE status = 'started' AND performed_by_id = $1`,
      [userId],
    );
    return rows;
  } catch (error) {
    logger.error("Failed to fetch incomplete stock take sessions", { error });
    throw error;
  }
};

exports.getStockTakeItems = async (sessionId) => {
  logger.info("Fetching stock take items", { sessionId });

  try {
    const { rows } = await pool.query(
      `SELECT sti.*, p.name AS product_name
       FROM stock_take_items sti
       LEFT JOIN products p ON p.id = sti.product_id
       WHERE sti.stock_take_id = $1`,
      [sessionId],
    );
    return rows.map(({ product_name, ...item }) => ({
      ...item,
      product_name: product_name ?? null,
    }));
  } catch (error) {
    logger.error("Failed to fetch stock take items", { sessionId, error });
    throw error;
  }
};

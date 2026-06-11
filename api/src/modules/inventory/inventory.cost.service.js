const pool = require("../../config/db");
const logger = require("../../utils/logger");

exports.getProductsMissingCost = async (limit = 100, offset = 0) => {
  const { rows } = await pool.query(
    `SELECT * FROM rpc_get_products_missing_cost($1, $2)`,
    [limit, offset]
  );
  if (!rows) throw new Error("FAILED_TO_FETCH_MISSING_COST_PRODUCTS");
  return rows || [];
};

exports.getProductCogsHistory = async (productId) => {
  const { rows } = await pool.query(
    `SELECT * FROM rpc_get_product_cogs_history($1)`,
    [productId]
  );
  if (!rows) throw new Error("FAILED_TO_FETCH_COGS_HISTORY");
  return rows || [];
};

exports.updateProductCost = async (
  productId,
  newCost,
  backfillHistorical = false,
  backfillFromDate = null,
  context = {}
) => {
  logger.info("Updating product cost", {
    productId,
    newCost,
    backfillHistorical,
    userId: context.userId,
  });

  let rows;
  try {
    const result = await pool.query(
      `SELECT * FROM update_product_cost($1, $2, $3, $4)`,
      [productId, newCost, backfillHistorical, backfillFromDate]
    );
    rows = result.rows;
  } catch (err) {
    logger.error("Failed to update product cost", { error: err.message });
    throw new Error(err.message || "FAILED_TO_UPDATE_PRODUCT_COST");
  }

  // Log to audit
  await pool.query(
    `INSERT INTO cogs_backfill_audit (product_id, new_cost, backfilled_by, notes)
     VALUES ($1, $2, $3, $4)`,
    [
      productId,
      newCost,
      context.userId,
      `Cost updated${backfillHistorical ? " with backfill" : ""}`,
    ]
  );

  return rows;
};

exports.backfillProductCogs = async (
  productId,
  unitCost,
  effectiveDate = null,
  description = "COGS backfill - cost correction",
  context = {}
) => {
  logger.info("Backfilling product COGS", {
    productId,
    unitCost,
    effectiveDate,
    userId: context.userId,
  });

  let rows;
  try {
    const result = await pool.query(
      `SELECT * FROM backfill_product_cogs($1, $2, $3, $4)`,
      [productId, unitCost, effectiveDate, description]
    );
    rows = result.rows;
  } catch (err) {
    logger.error("Failed to backfill COGS", { error: err.message });
    throw new Error(err.message || "FAILED_TO_BACKFILL_COGS");
  }

  const data = rows[0] || null;

  // Log audit
  await pool.query(
    `INSERT INTO cogs_backfill_audit (product_id, new_cost, backfill_count, total_cogs, backfilled_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      productId,
      unitCost,
      data?.backfill_count || 0,
      data?.total_cogs || 0,
      context.userId,
      description,
    ]
  );

  return data;
};

exports.bulkBackfillCogs = async (backfills, context = {}) => {
  logger.info("Bulk backfilling COGS", {
    count: backfills.length,
    userId: context.userId,
  });

  let rows;
  try {
    const result = await pool.query(
      `SELECT * FROM bulk_backfill_cogs($1::jsonb)`,
      [JSON.stringify(backfills)]
    );
    rows = result.rows;
  } catch (err) {
    logger.error("Failed bulk backfill", { error: err.message });
    throw new Error(err.message || "FAILED_BULK_BACKFILL");
  }

  // Log individual audits
  for (const b of backfills) {
    await pool.query(
      `INSERT INTO cogs_backfill_audit (product_id, new_cost, backfilled_by, notes)
       VALUES ($1, $2, $3, $4)`,
      [
        b.product_id,
        b.unit_cost,
        context.userId,
        `Bulk backfill: ${b.description || "N/A"}`,
      ]
    );
  }

  return rows;
};

exports.getMissingCostStats = async () => {
  const { rows: data } = await pool.query(
    `SELECT zero_cost_sale_count, zero_cost_quantity, zero_cost_revenue, has_zero_cost_sales
     FROM v_products_missing_cost`
  );

  if (!data) throw new Error("FAILED_TO_FETCH_STATS");

  const stats = {
    totalProductsWithMissingCost: data?.length || 0,
    productsWithZeroCostSales: data?.filter((p) => p.has_zero_cost_sales).length || 0,
    totalZeroCostSales: data?.reduce((sum, p) => sum + (p.zero_cost_sale_count || 0), 0) || 0,
    totalZeroCostQuantity:
      data?.reduce((sum, p) => sum + parseFloat(p.zero_cost_quantity || 0), 0) || 0,
    totalZeroCostRevenue:
      data?.reduce((sum, p) => sum + parseFloat(p.zero_cost_revenue || 0), 0) || 0,
  };

  return stats;
};

exports.getBackfillAuditLog = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.product_id) {
    params.push(filters.product_id);
    conditions.push(`a.product_id = $${params.length}`);
  }
  if (filters.from_date) {
    params.push(filters.from_date);
    conditions.push(`a.backfilled_at >= $${params.length}`);
  }
  if (filters.to_date) {
    params.push(filters.to_date);
    conditions.push(`a.backfilled_at <= $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT a.*,
       json_build_object('name', p.name) AS product,
       json_build_object('name', u.name) AS backfilled_by_user
     FROM cogs_backfill_audit a
     LEFT JOIN products p ON p.id = a.product_id
     LEFT JOIN profiles u ON u.id = a.backfilled_by
     ${where}
     ORDER BY a.backfilled_at DESC`,
    params
  );
  return { data: rows, error: null };
};

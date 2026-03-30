const getSupabase = require("../../config/supabase");
const logger = require("../../utils/logger");

exports.getProductsMissingCost = async (limit = 100, offset = 0) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("rpc_get_products_missing_cost", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw new Error("FAILED_TO_FETCH_MISSING_COST_PRODUCTS");
  return data || [];
};

exports.getProductCogsHistory = async (productId) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("rpc_get_product_cogs_history", {
    p_product_id: productId,
  });

  if (error) throw new Error("FAILED_TO_FETCH_COGS_HISTORY");
  return data || [];
};

exports.updateProductCost = async (
  productId,
  newCost,
  backfillHistorical = false,
  backfillFromDate = null,
  context = {}
) => {
  const supabase = getSupabase();

  logger.info("Updating product cost", {
    productId,
    newCost,
    backfillHistorical,
    userId: context.userId,
  });

  const { data, error } = await supabase.rpc("update_product_cost", {
    p_product_id: productId,
    p_new_cost: newCost,
    p_backfill_historical: backfillHistorical,
    p_backfill_from_date: backfillFromDate,
  });

  if (error) {
    logger.error("Failed to update product cost", { error: error.message });
    throw new Error(error.message || "FAILED_TO_UPDATE_PRODUCT_COST");
  }

  // Log to audit
  await supabase.from("cogs_backfill_audit").insert({
    product_id: productId,
    new_cost: newCost,
    backfilled_by: context.userId,
    notes: `Cost updated${backfillHistorical ? " with backfill" : ""}`,
  });

  return data;
};

exports.backfillProductCogs = async (
  productId,
  unitCost,
  effectiveDate = null,
  description = "COGS backfill - cost correction",
  context = {}
) => {
  const supabase = getSupabase();

  logger.info("Backfilling product COGS", {
    productId,
    unitCost,
    effectiveDate,
    userId: context.userId,
  });

  const { data, error } = await supabase.rpc("backfill_product_cogs", {
    p_product_id: productId,
    p_unit_cost: unitCost,
    p_effective_date: effectiveDate,
    p_journal_description: description,
  });

  if (error) {
    logger.error("Failed to backfill COGS", { error: error.message });
    throw new Error(error.message || "FAILED_TO_BACKFILL_COGS");
  }

  // Log audit
  await supabase.from("cogs_backfill_audit").insert({
    product_id: productId,
    new_cost: unitCost,
    backfill_count: data?.backfill_count || 0,
    total_cogs: data?.total_cogs || 0,
    backfilled_by: context.userId,
    notes: description,
  });

  return data;
};

exports.bulkBackfillCogs = async (backfills, context = {}) => {
  const supabase = getSupabase();

  logger.info("Bulk backfilling COGS", {
    count: backfills.length,
    userId: context.userId,
  });

  const { data, error } = await supabase.rpc("bulk_backfill_cogs", {
    p_backfills: JSON.stringify(backfills),
  });

  if (error) {
    logger.error("Failed bulk backfill", { error: error.message });
    throw new Error(error.message || "FAILED_BULK_BACKFILL");
  }

  // Log individual audits
  const audits = backfills.map((b) => ({
    product_id: b.product_id,
    new_cost: b.unit_cost,
    backfilled_by: context.userId,
    notes: `Bulk backfill: ${b.description || "N/A"}`,
  }));

  await supabase.from("cogs_backfill_audit").insert(audits);

  return data;
};

exports.getMissingCostStats = async () => {
  const supabase = getSupabase();

  // Get summary stats from the view
  const { data, error } = await supabase
    .from("v_products_missing_cost")
    .select(
      "zero_cost_sale_count, zero_cost_quantity, zero_cost_revenue, has_zero_cost_sales"
    );

  if (error) throw new Error("FAILED_TO_FETCH_STATS");

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
  const supabase = getSupabase();

  let query = supabase
    .from("cogs_backfill_audit")
    .select("*, product:product_id(name), backfilled_by_user:backfilled_by(name)")
    .order("backfilled_at", { ascending: false });

  if (filters.product_id) query = query.eq("product_id", filters.product_id);
  if (filters.from_date)
    query = query.gte("backfilled_at", filters.from_date);
  if (filters.to_date) query = query.lte("backfilled_at", filters.to_date);

  return query;
};

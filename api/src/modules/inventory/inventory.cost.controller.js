const inventoryCostService = require("./inventory.cost.service");
const auditRepo = require("../audit/audit.repository");

exports.getMissingCost = async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const data = await inventoryCostService.getProductsMissingCost(
      parseInt(limit),
      parseInt(offset)
    );
    res.json({ products: data });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const stats = await inventoryCostService.getMissingCostStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

exports.getCogsHistory = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const data = await inventoryCostService.getProductCogsHistory(productId);
    res.json({ history: data });
  } catch (err) {
    next(err);
  }
};

exports.updateCost = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { newCost, backfillHistorical, backfillFromDate } = req.body;

    if (!newCost || newCost <= 0) {
      return res.status(400).json({ error: "VALID_COST_REQUIRED" });
    }

    const result = await inventoryCostService.updateProductCost(
      productId,
      parseFloat(newCost),
      backfillHistorical,
      backfillFromDate,
      { userId: req.user.id }
    );

    await auditRepo.log({
      entity: "products",
      entity_id: productId,
      action: "PRODUCT_COST_UPDATED",
      performed_by: req.user.id,
      correlation_id: req.correlationId,
      metadata: {
        old_cost: result.old_cost,
        new_cost: result.new_cost,
        backfill_performed: result.backfill_performed,
      },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.backfillCogs = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { unitCost, effectiveDate, description } = req.body;

    if (!unitCost || unitCost <= 0) {
      return res.status(400).json({ error: "VALID_UNIT_COST_REQUIRED" });
    }

    const result = await inventoryCostService.backfillProductCogs(
      productId,
      parseFloat(unitCost),
      effectiveDate,
      description || "COGS backfill",
      { userId: req.user.id }
    );

    await auditRepo.log({
      entity: "products",
      entity_id: productId,
      action: "COGS_BACKFILLED",
      performed_by: req.user.id,
      correlation_id: req.correlationId,
      metadata: {
        unit_cost: unitCost,
        backfill_count: result.backfill_count,
        total_cogs: result.total_cogs,
      },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.bulkBackfill = async (req, res, next) => {
  try {
    const { backfills } = req.body;

    if (!Array.isArray(backfills) || backfills.length === 0) {
      return res.status(400).json({ error: "BACKFILLS_ARRAY_REQUIRED" });
    }

    const result = await inventoryCostService.bulkBackfillCogs(backfills, {
      userId: req.user.id,
    });

    await auditRepo.log({
      entity: "products",
      action: "BULK_COGS_BACKFILLED",
      performed_by: req.user.id,
      correlation_id: req.correlationId,
      metadata: {
        product_count: backfills.length,
        total_movements: result.total_movements_backfilled,
      },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getAuditLog = async (req, res, next) => {
  try {
    const { data, error } = await inventoryCostService.getBackfillAuditLog(
      req.query
    );
    if (error) throw new Error("FAILED_TO_FETCH_AUDIT_LOG");
    res.json({ entries: data });
  } catch (err) {
    next(err);
  }
};

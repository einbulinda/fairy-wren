const express = require("express");
const router = express.Router();
const controller = require("./inventory.cost.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/rbac.middleware");

router.use(authenticate);

// Get products with missing cost
router.get("/missing-cost", controller.getMissingCost);

// Get missing cost stats
router.get("/missing-cost/stats", controller.getStats);

// Get COGS history for a product
router.get("/:productId/cogs-history", controller.getCogsHistory);

// Update product cost (with optional backfill)
router.put(
  "/:productId/cost",
  requirePermission("edit_product_cost"),
  controller.updateCost
);

// Backfill COGS for a specific product
router.post(
  "/:productId/backfill-cogs",
  requirePermission("backfill_cogs"),
  controller.backfillCogs
);

// Bulk backfill COGS
router.post(
  "/bulk-backfill-cogs",
  requirePermission("backfill_cogs"),
  controller.bulkBackfill
);

// Get COGS backfill audit log
router.get("/audit/cogs-backfill", controller.getAuditLog);

module.exports = router;

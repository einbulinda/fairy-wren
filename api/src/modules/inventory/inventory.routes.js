const express = require("express");
const controller = require("./inventory.controller");
const { requireRole, requirePermission } = require("../../middleware/rbac.middleware");

const router = express.Router();

/* ======================================================
   INVENTORY STOCK (VISIBILITY)
   ====================================================== */

router.get("/items", controller.getInventoryItems);

/* ======================================================
   PROCUREMENT / RECEIVING
   ====================================================== */

router.post(
  "/receipts",
  requirePermission("receive_goods"),
  controller.createInventoryReceipt,
);
router.get(
  "/receipts",
  requireRole("director", "owner"),
  controller.getAllReceipts,
);
router.get(
  "/receipts/pending",
  requireRole("director", "owner"),
  controller.getPendingReceipts,
);
router.get("/receipts/:id", controller.getReceiptDetail);
router.post(
  "/receipts/:id/approve",
  requireRole("director", "owner"),
  controller.approveReceipt,
);
router.post(
  "/receipts/:id/reject",
  requireRole("director", "owner"),
  controller.rejectReceipt,
);
router.post(
  "/receipts/:id/pay",
  requireRole("director", "owner"),
  controller.markReceiptPaid,
);
router.post(
  "/receipts/:id/cancel",
  requireRole("director", "owner"),
  controller.cancelReceipt,
);

/* ======================================================
   STOCK TAKE (RPC-BASED)
   ====================================================== */

router.post("/stock-take-sessions", controller.createStockTakeSession);
router.get(
  "/stock-take-sessions/incomplete",
  controller.getIncompleteStockTakes,
);
router.post("/stock-take-sessions/:id/items", controller.recordStockTakeItem);
router.get("/stock-take-sessions/:id/items", controller.getStockTakeItems);
router.post(
  "/stock-take-sessions/:id/complete",
  controller.completeStockTakeSession,
);
router.post(
  "/stock-take-sessions/:id/approve",
  requireRole("director", "owner"),
  controller.approveStockTake,
);
router.post(
  "/stock-take-sessions/:id/reject",
  requireRole("director", "owner"),
  controller.rejectStockTake,
);

/* ======================================================
   STOCK TAKE REPORTING
   ====================================================== */
router.get("/stock-take-adjustments", controller.getStockTakeAdjustments);
router.get("/reports/stock-take", controller.getStockTakeReports);
router.get("/reports/adjustment-insights", controller.getAdjustmentInsights);
router.get("/reports/stock-take/:id", controller.getStockTakeDetail);

/* ======================================================
   INVENTORY LEDGER
   ====================================================== */
router.get("/ledger", controller.getInventoryLedger);

/* ======================================================
   REORDER LEVEL POLICIES
   ====================================================== */
router.get("/reorder-policies", controller.getReorderPolicies);
router.get("/movement-analysis", controller.getMovementAnalysis);
router.get("/reorder-forecast", controller.getReorderForecast);
router.get("/reorder-alerts", controller.getReorderAlerts);
router.get("/reorder-settings", controller.getReorderSettings);
router.patch(
  "/reorder-settings",
  requireRole("director", "owner"),
  controller.updateReorderSettings,
);
router.post(
  "/reorder-refresh",
  requireRole("director", "owner"),
  controller.triggerReorderRefresh,
);
router.get("/reorder-policies/:productId", controller.getReorderPolicy);
router.post(
  "/reorder-policies/:productId/override",
  requireRole("director", "owner"),
  controller.setManualReorderLevel,
);
router.delete(
  "/reorder-policies/:productId/override",
  requireRole("director", "owner"),
  controller.clearReorderOverride,
);

/* ======================================================
   PRODUCT CONVERSIONS
   ====================================================== */
router.get("/conversions/products", controller.getConvertibleProducts);
router.get("/conversions/tot-size", controller.getTotSize);
router.get("/conversions/history", controller.getConversionHistory);
router.post(
  "/conversions",
  requireRole("director", "owner"),
  controller.executeConversion,
);

module.exports = router;

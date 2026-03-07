const express = require("express");
const controller = require("./inventory.controller");
const { requireRole } = require("../../middleware/rbac.middleware");

const router = express.Router();

/* ======================================================
   INVENTORY STOCK (VISIBILITY)
   ====================================================== */

router.get("/items", controller.getInventoryItems);

/* ======================================================
   PROCUREMENT / RECEIVING
   ====================================================== */

router.post("/receipts", requireRole("manager", "owner"), controller.createInventoryReceipt);
router.get("/receipts/:id", controller.getReceiptDetail);
router.post("/receipts/:id/pay", requireRole("manager", "owner"), controller.markReceiptPaid);

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
router.post("/stock-take-sessions/:id/approve", requireRole("manager", "owner"), controller.approveStockTake);
router.post("/stock-take-sessions/:id/reject", requireRole("manager", "owner"), controller.rejectStockTake);

/* ======================================================
   STOCK TAKE REPORTING
   ====================================================== */
router.get("/stock-take-adjustments", controller.getStockTakeAdjustments);
router.get("/reports/stock-take", controller.getStockTakeReports);
router.get("/reports/stock-take/:id", controller.getStockTakeDetail);

/* ======================================================
   INVENTORY LEDGER
   ====================================================== */
router.get("/ledger", controller.getInventoryLedger);

module.exports = router;

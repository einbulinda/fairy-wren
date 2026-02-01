const express = require("express");
const router = express.Router();
const inventoryController = require("./inventory.controller");

/* Stock */
router.get("/stock", inventoryController.getStock);

/* Ledger */
router.get("/ledger", inventoryController.getLedger);

/* Restocking */
router.post("/restock", inventoryController.restock);

/* Stock Takes */
router.post("/stock-takes", inventoryController.createStockTake);
router.post("/stock-takes/:id/items", inventoryController.saveStockTakeItems);
router.post("/stock-takes/:id/complete", inventoryController.completeStockTake);
/* Stock Take Sessions */
router.post("/stock-take-sessions", inventoryController.createStockTakeSession);
router.post(
  "/stock-take-sessions/item",
  inventoryController.recordStockTakeItem,
);
router.post(
  "/stock-take-sessions/:id/complete",
  inventoryController.completeStockTakeSession,
);
router.get(
  "/stock-take-sessions/incomplete",
  inventoryController.getIncompleteStockTakes,
);
router.get(
  "/stock-take-sessions/:id/items",
  inventoryController.getStockTakeItems,
);

/* Receive Stock */
router.post("/receive", inventoryController.receiveInventory);

/* Reports */
router.get("/reports/stock-take", inventoryController.getStockTakeAdjustments);

module.exports = router;

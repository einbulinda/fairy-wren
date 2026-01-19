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

/* Receive Stock */
router.post("/receive", inventoryController.receiveInventory);

/* Reports */
router.get("/reports/stock-take", inventoryController.getStockTakeAdjustments);

module.exports = router;

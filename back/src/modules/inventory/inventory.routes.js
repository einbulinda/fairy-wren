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

module.exports = router;

/*
GET	    /api/inventory/stock	                Current stock levels
POST	/api/inventory/restock	                Add stock
POST	/api/inventory/stock-takes	            Create stock take
POST	/api/inventory/stock-takes/:id/items	Save physical counts
POST	/api/inventory/stock-takes/:id/complete	Apply variances
GET	    /api/inventory/ledger	                Stock movement
*/

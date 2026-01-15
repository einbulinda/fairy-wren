const express = require("express");
const router = express.Router();
const billsController = require("./bills.controller");

router.post("/", billsController.createBill);
router.post("/:billId/rounds", billsController.addRound);
router.get("/open", billsController.openBills);
router.get("/:billId", billsController.getBillById);
router.get("/", billsController.getAllBills);
router.patch("/:billId/void", billsController.voidOpenBill);

module.exports = router;

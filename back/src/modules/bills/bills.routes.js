const express = require("express");
const router = express.Router();
const billsController = require("./bills.controller");

router.post("/", billsController.createBill);
router.post("/:billId/rounds", billsController.addRound);
router.get("/open", billsController.openBills);
router.patch("/:billId/mark-paid", billsController.payBills);
router.patch("/:billId/confirm", billsController.confirmPayment);

module.exports = router;

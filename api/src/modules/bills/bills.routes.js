const express = require("express");
const controller = require("./bills.controller");

const router = express.Router();

// Bills
router.get("/", controller.listBills);
router.get("/my-stats", controller.getMyStats);
router.post("/", controller.createBill);
router.get("/:id", controller.getBill);

// Bill lifecycle
router.patch("/:id/status", controller.updateBillStatus);
router.delete("/:id", controller.voidBill);

// Rounds (POS ordering waves)
router.post("/:id/rounds", controller.addRound);

// Item exchange (return item + add replacement)
router.post("/:id/exchange", controller.exchangeItem);

module.exports = router;

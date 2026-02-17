const express = require("express");
const controller = require("./payments.controller");

const router = express.Router();

router.get("/", controller.listPayments);
router.post("/", controller.processPayment);
router.get("/bills", controller.fetchBillsWithPayments);

module.exports = router;

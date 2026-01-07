const express = require("express");
const router = express.Router();
const paymentController = require("./payments.controller");

router.get("/", paymentController.getBills);
router.patch("/:billId", paymentController.confirmBillController);

module.exports = router;

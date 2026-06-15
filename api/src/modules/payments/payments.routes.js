const express = require("express");
const controller = require("./payments.controller");
const { requirePermission } = require("../../middleware/rbac.middleware");

const router = express.Router();

router.get("/", controller.listPayments);
router.post("/", requirePermission("process_payments"), controller.processPayment);
router.get("/bills", controller.fetchBillsWithPayments);

module.exports = router;

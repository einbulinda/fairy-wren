const express = require("express");
const router = express.Router();
const reportsController = require("./reports.controller");

router.get("/total-revenue", reportsController.totalRevenue);
router.get("/daily-revenue", reportsController.dailyRevenue);
router.get("/payment-types", reportsController.paymentTypeSummary);
router.get("/average-bill-value", reportsController.averageBillValue);
router.get("/outstanding-bills", reportsController.outstandingBills);
router.get("/category-sales", reportsController.categorySales);

module.exports = router;

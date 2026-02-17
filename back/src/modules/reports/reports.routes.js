const express = require("express");
const router = express.Router();
const reportsController = require("./reports.controller");

/**
 * Reports Routes
 * Base path: /reports
 */

// Get all dashboard metrics in a single request (recommended for dashboard pages)
router.get("/dashboard", (req, res, next) =>
  reportsController.getDashboardMetrics(req, res, next)
);

// Performance comparison endpoints (optimized single endpoint)
router.get("/performance-comparisons", (req, res, next) =>
  reportsController.getPerformanceComparisons(req, res, next)
);

// Individual performance comparison endpoints
router.get("/weekly-performance", (req, res, next) =>
  reportsController.getWeeklyPerformance(req, res, next)
);
router.get("/monthly-performance", (req, res, next) =>
  reportsController.getMonthlyPerformance(req, res, next)
);
router.get("/weekend-weekday-performance", (req, res, next) =>
  reportsController.getWeekendWeekdayPerformance(req, res, next)
);
router.get("/day-of-week-performance", (req, res, next) =>
  reportsController.getDayOfWeekPerformance(req, res, next)
);

// Individual metric endpoints
router.get("/total-revenue", (req, res, next) =>
  reportsController.getTotalRevenue(req, res, next)
);
router.get("/daily-revenue", (req, res, next) =>
  reportsController.getDailyRevenue(req, res, next)
);
router.get("/payment-types", (req, res, next) =>
  reportsController.getPaymentTypeSummary(req, res, next)
);
router.get("/average-bill-value", (req, res, next) =>
  reportsController.getAverageBillValue(req, res, next)
);
router.get("/outstanding-bills", (req, res, next) =>
  reportsController.getOutstandingBills(req, res, next)
);
router.get("/category-sales", (req, res, next) =>
  reportsController.getCategorySales(req, res, next)
);

module.exports = router;

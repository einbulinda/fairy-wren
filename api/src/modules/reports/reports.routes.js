const express = require("express");
const router = express.Router();
const reportsController = require("./reports.controller");
const { requirePermission } = require("../../middleware/rbac.middleware");

/**
 * Reports Routes
 * Base path: /reports
 *
 * Permission tiers:
 *   z_report      — daily sales summary (bartender, owner; owner-grantable)
 *   weekly_sales  — weekly performance (bartender, owner; owner-grantable)
 *   view_reports  — all other reports (owner only by default; owner-grantable)
 */

// Get all dashboard metrics in a single request (recommended for dashboard pages)
router.get("/dashboard", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getDashboardMetrics(req, res, next)
);

// Performance comparison endpoints (optimized single endpoint)
router.get("/performance-comparisons", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getPerformanceComparisons(req, res, next)
);

// Individual performance comparison endpoints
router.get("/weekly-performance", requirePermission("weekly_sales"), (req, res, next) =>
  reportsController.getWeeklyPerformance(req, res, next)
);
router.get("/monthly-performance", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getMonthlyPerformance(req, res, next)
);
router.get("/weekend-weekday-performance", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getWeekendWeekdayPerformance(req, res, next)
);
router.get("/day-of-week-performance", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getDayOfWeekPerformance(req, res, next)
);

// Individual metric endpoints
router.get("/total-revenue", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getTotalRevenue(req, res, next)
);
router.get("/daily-revenue", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getDailyRevenue(req, res, next)
);
router.get("/payment-types", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getPaymentTypeSummary(req, res, next)
);
router.get("/average-bill-value", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getAverageBillValue(req, res, next)
);
router.get("/outstanding-bills", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getOutstandingBills(req, res, next)
);
router.get("/category-sales", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getCategorySales(req, res, next)
);

// Financial statement endpoints
router.get("/balance-sheet", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getBalanceSheet(req, res, next)
);
router.get("/income-statement", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getIncomeStatement(req, res, next)
);
router.get("/trial-balance", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getTrialBalance(req, res, next)
);
router.get("/cash-flow", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getCashFlowStatement(req, res, next)
);
router.get("/equity-changes", requirePermission("view_reports"), (req, res, next) =>
  reportsController.getEquityChanges(req, res, next)
);

// Z-Report (daily sales summary)
router.get("/z-report", requirePermission("z_report"), (req, res, next) =>
  reportsController.getZReport(req, res, next)
);

module.exports = router;

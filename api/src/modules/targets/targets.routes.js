const express = require("express");
const controller = require("./targets.controller");
const { requireRole } = require("../../middleware/rbac.middleware");

const router = express.Router();

// ==========================================
// BUSINESS TARGETS ROUTES
// ==========================================

// Get single month target
router.get("/business/:year/:month", controller.getBusinessTarget);

// Get all targets for a year
router.get("/business/year/:year", controller.getYearlyBusinessTargets);

// Save/update a target
router.post("/business", requireRole("owner", "manager"), controller.saveBusinessTarget);

// Bulk update targets for a year
router.post("/business/bulk/:year", requireRole("owner", "manager"), controller.bulkUpdateBusinessTargets);

// ==========================================
// USER/STAFF TARGETS ROUTES
// ==========================================

// Get single user target
router.get("/user/:userId/:year/:month", controller.getUserTarget);

// Get all user targets for a month
router.get("/users/:year/:month", controller.getAllUserTargets);

// Save/update a user target
router.post("/user", requireRole("owner", "manager"), controller.saveUserTarget);

// Bulk update user targets
router.post("/users/bulk/:year/:month", requireRole("owner", "manager"), controller.bulkUpdateUserTargets);

// ==========================================
// CATEGORY TARGETS ROUTES
// ==========================================

// Get category targets for a month
router.get("/categories/:year/:month", controller.getCategoryTargets);

// Save/update a category target
router.post("/category", requireRole("owner", "manager"), controller.saveCategoryTarget);

// ==========================================
// DASHBOARD INTEGRATION
// ==========================================

// Get all targets formatted for dashboard
router.get("/dashboard/:year/:month", controller.getDashboardTargets);

module.exports = router;

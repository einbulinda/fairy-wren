const express = require("express");
const router = express.Router();
const controller = require("./periods.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/rbac.middleware");

router.use(authenticate);

// List all periods
router.get("/", controller.list);

// Get current period status
router.get("/status/current", controller.getCurrentStatus);

// Validate posting date
router.get("/validate-date", controller.validateDate);

// Generate periods for a year
router.post("/generate", requirePermission("manage_periods"), controller.generate);

// Get period by ID
router.get("/:id", controller.getById);

// Get period stats
router.get("/:year/:month/stats", controller.getStats);

// Close a period
router.post("/:year/:month/close", requirePermission("close_periods"), controller.close);

// Reopen a period
router.post("/:year/:month/reopen", requirePermission("reopen_periods"), controller.reopen);

module.exports = router;

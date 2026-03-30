const express = require("express");
const router = express.Router();
const controller = require("./bank-reconciliation.controller");
const authenticate = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/rbac.middleware");

router.use(authenticate);

// List bank statements
router.get("/", controller.listStatements);

// Get bank GL details for matching
router.get("/gl/:accountId", controller.getBankGlDetails);

// Import bank statement
router.post(
  "/import",
  requirePermission("import_bank_statements"),
  controller.importStatement
);

// Get statement details
router.get("/:id", controller.getStatement);

// Get reconciliation report
router.get("/:id/report", controller.getReconciliationReport);

// Auto-match statement lines
router.post("/:id/auto-match", controller.autoMatch);

// Manual match a line
router.post("/:id/lines/:lineId/match", controller.manualMatch);

// Get suggested matches for a line
router.get("/:id/lines/:lineId/suggestions", controller.getSuggestedMatches);

// Unmatch a line
router.post("/:id/lines/:lineId/unmatch", controller.unmatchLine);

// Finalize reconciliation
router.post(
  "/:id/finalize",
  requirePermission("finalize_reconciliation"),
  controller.finalize
);

module.exports = router;

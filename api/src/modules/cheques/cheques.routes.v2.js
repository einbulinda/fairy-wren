const express = require("express");
const router = express.Router();
const controller = require("./cheques.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/rbac.middleware");

// All routes require authentication
router.use(authenticate);

// List all cheques
router.get("/", controller.list);

// Get linkage report (for debugging data flow)
router.get("/linkage-report", 
  requirePermission("view_cheque_linkage"),
  controller.getLinkageReport
);

// Validate accounts before creating cheque
router.post("/validate-accounts", controller.validateAccounts);

// Create new cheque/transfer
router.post("/", 
  requirePermission("create_cheques"),
  controller.create
);

// Get cheque by ID
router.get("/:id", controller.getById);

// Mark cheque as cleared
router.post("/:id/clear", 
  requirePermission("clear_cheques"),
  controller.clear
);

// Void cheque
router.post("/:id/void", 
  requirePermission("void_cheques"),
  controller.void
);

// Real-time subscription (SSE)
router.get("/stream/updates", controller.subscribe);

module.exports = router;

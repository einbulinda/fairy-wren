const express = require("express");
const controller = require("./audit.controller");
const { requirePermission } = require("../../middleware/rbac.middleware");

const router = express.Router();

router.get("/", requirePermission("view_audit_trail"), controller.listLogs);
router.get("/entities", requirePermission("view_audit_trail"), controller.getDistinctEntities);

module.exports = router;

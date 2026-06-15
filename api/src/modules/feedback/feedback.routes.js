const express = require("express");
const router = express.Router();
const controller = require("./feedback.controller");
const { requirePermission } = require("../../middleware/rbac.middleware");

router.get("/", controller.list);
router.patch("/:id/read", requirePermission("manage_feedback"), controller.markRead);
router.patch("/:id/archive", requirePermission("manage_feedback"), controller.archive);

module.exports = router;

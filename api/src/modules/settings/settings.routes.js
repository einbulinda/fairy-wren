const express = require("express");
const controller = require("./settings.controller");
const { requireRole } = require("../../middleware/rbac.middleware");

const router = express.Router();

router.get("/", controller.getSettings);
router.put("/", requireRole("owner"), controller.updateSettings);

module.exports = router;

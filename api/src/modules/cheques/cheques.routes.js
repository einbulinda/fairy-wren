const express = require("express");
const controller = require("./cheques.controller");
const { requireRole } = require("../../middleware/rbac.middleware");

const router = express.Router();

router.get("/", requireRole("manager", "owner"), controller.listCheques);
router.post("/", requireRole("manager", "owner"), controller.createCheque);
router.get("/:chequeId", requireRole("manager", "owner"), controller.getCheque);
router.patch("/:chequeId/clear", requireRole("manager", "owner"), controller.clearCheque);
router.patch("/:chequeId/void", requireRole("manager", "owner"), controller.voidCheque);

module.exports = router;

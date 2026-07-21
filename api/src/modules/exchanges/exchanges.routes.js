const express = require("express");
const controller = require("./exchanges.controller");
const { requireRole, requirePermission } = require("../../middleware/rbac.middleware");

const router = express.Router();

/* ======================================================
   BUSINESS PARTNERS
   ====================================================== */
router.get("/partners", controller.listPartners);
router.post(
  "/partners",
  requirePermission("manage_exchanges"),
  controller.createPartner,
);

/* ======================================================
   PRODUCT EXCHANGES
   ====================================================== */
router.post(
  "/",
  requirePermission("manage_exchanges"),
  controller.createExchange,
);
router.get(
  "/",
  requirePermission("manage_exchanges"),
  controller.getAllExchanges,
);
router.get(
  "/pending",
  requireRole("director", "owner"),
  controller.getPendingExchanges,
);
router.get("/:id", controller.getExchangeDetail);
router.post(
  "/:id/approve",
  requireRole("director", "owner"),
  controller.approveExchange,
);
router.post(
  "/:id/reject",
  requireRole("director", "owner"),
  controller.rejectExchange,
);

module.exports = router;

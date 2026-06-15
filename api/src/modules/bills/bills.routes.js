const express = require("express");
const controller = require("./bills.controller");
const { requirePermission } = require("../../middleware/rbac.middleware");

const router = express.Router();

// Bills
router.get("/", controller.listBills);
router.get("/my-stats", controller.getMyStats);
router.post("/", requirePermission("pos_access"), controller.createBill);
router.get("/:id", controller.getBill);

// Bill lifecycle — status changes and voids require payment approval rights
router.patch("/:id/status", requirePermission("approve_payments"), controller.updateBillStatus);
router.delete("/:id", requirePermission("approve_payments"), controller.voidBill);

// Rounds (POS ordering waves)
router.post("/:id/rounds", requirePermission("pos_access"), controller.addRound);

// Item exchange — route requires POS access; approver PIN is enforced in the service
router.post("/:id/exchange", requirePermission("pos_access"), controller.exchangeItem);

module.exports = router;

const express = require("express");
const controller = require("./accounts.controller");
const { requireRole } = require("../../middleware/rbac.middleware");

const router = express.Router();

// Collection
router.get("/", controller.listAccounts);
router.post("/", requireRole("manager", "owner"), controller.createAccount);

// Resource
router.get("/:accountId", controller.getAccount);
router.put("/:accountId", requireRole("manager", "owner"), controller.updateAccount);

// Explicit sub-resources
router.patch("/:accountId/status", requireRole("manager", "owner"), controller.updateAccountStatus);
router.get("/:accountId/children", controller.getChildAccounts);
router.get("/:accountId/ledger", controller.getAccountLedger);

// Delete
router.delete("/:accountId", requireRole("owner"), controller.deleteAccount);

module.exports = router;

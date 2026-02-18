const express = require("express");
const controller = require("./accounts.controller");

const router = express.Router();

// Collection
router.get("/", controller.listAccounts);
router.post("/", controller.createAccount);

// Resource
router.get("/:accountId", controller.getAccount);
router.put("/:accountId", controller.updateAccount);

// Explicit sub-resources
router.patch("/:accountId/status", controller.updateAccountStatus);
router.get("/:accountId/children", controller.getChildAccounts);
router.get("/:accountId/ledger", controller.getAccountLedger);

// Delete
router.delete("/:accountId", controller.deleteAccount);

module.exports = router;

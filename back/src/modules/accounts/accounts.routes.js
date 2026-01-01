const express = require("express");
const router = express.Router();
const accountsController = require("./accounts.controller");

router.get("/", accountsController.getAccounts);
router.post("/", accountsController.createAccount);
router.patch("/:accountId", accountsController.updateAccount);
router.patch("/:accountId/status", accountsController.toggleStatus);

module.exports = router;

const express = require("express");
const controller = require("./customers.controller");

const router = express.Router();

// Discovery — must come before /:id routes
router.get("/unlinked/names", controller.listUnlinkedNames);
router.get("/unlinked/bills", controller.listUnlinkedBillsForName);

// Accounts
router.get("/", controller.listAccounts);
router.post("/", controller.createAccount);
router.get("/:id/bills", controller.getAccountBills);
router.post("/:id/link", controller.linkName);
router.post("/:id/link-bills", controller.linkBills);
router.delete("/:id/bills/:billId", controller.unlinkBill);
router.patch("/:id", controller.updateAccount);
router.delete("/:id", controller.deleteAccount);

module.exports = router;

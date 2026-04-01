const express = require("express");
const controller = require("./suppliers.controller");
const { requireRole } = require("../../middleware/rbac.middleware");

const router = express.Router();

router.get("/", controller.listSuppliers);
router.post("/", requireRole("manager", "owner"), controller.createSupplier);
router.get("/balances", controller.getBalances);
router.get("/pending-invoices", requireRole("manager", "owner"), controller.getPendingInvoices);

router.get("/:id/purchases", controller.getPurchases);
router.get("/:id/payments", controller.getPayments);
router.get("/:id/unpaid-invoices", controller.getUnpaidInvoices);
router.post("/:id/payments", requireRole("manager", "owner"), controller.createPayment);
router.get("/:id/statement", controller.getStatement);
router.get("/:id/statement/export", controller.exportStatementCsv);

router.get("/:id", controller.getSupplier);
router.patch("/:id", requireRole("manager", "owner"), controller.updateSupplier);
router.delete("/:id", requireRole("owner"), controller.archiveSupplier);

module.exports = router;

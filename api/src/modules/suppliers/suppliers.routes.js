const express = require("express");
const controller = require("./suppliers.controller");

const router = express.Router();

router.get("/", controller.listSuppliers);
router.post("/", controller.createSupplier);

router.get("/:id/purchases", controller.getPurchases);
router.get("/:id/payments", controller.getPayments);
router.post("/:id/payments", controller.createPayment);
router.get("/:id/statement", controller.getStatement);

router.get("/:id", controller.getSupplier);
router.patch("/:id", controller.updateSupplier);
router.delete("/:id", controller.archiveSupplier);

module.exports = router;

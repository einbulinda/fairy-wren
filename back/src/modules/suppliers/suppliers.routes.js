const express = require("express");
const router = express.Router();
const supplierController = require("./suppliers.controller");

router.get("/", supplierController.fetchSuppliers);
router.post("/", supplierController.createSupplier);
router.patch("/:supplierId", supplierController.editSupplier);

module.exports = router;

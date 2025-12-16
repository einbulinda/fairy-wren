const express = require("express");
const router = express.Router();
const productController = require("./products.controller");

router.get("/", productController.getProducts);
router.post("/", productController.createProduct);
router.patch("/:productId/stock", productController.updateProductStock);

module.exports = router;

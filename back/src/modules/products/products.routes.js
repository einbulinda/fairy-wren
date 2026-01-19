const express = require("express");
const router = express.Router();
const productController = require("./products.controller");
const uploadController = require("../uploads/product.uploads");
const upload = require("../../middleware/uploads.middleware");

router.get("/", productController.getProducts);
router.get("/:productId", productController.getProductById);
router.post("/", productController.createProduct);
router.put("/:productId", productController.updateProduct);
router.patch("/:productId/stock", productController.updateProductStock);
router.patch("/:productId/add-stock", productController.incrementStock);
router.patch("/:productId/status", productController.deactivateProduct);

module.exports = router;

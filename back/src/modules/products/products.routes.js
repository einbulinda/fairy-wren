const express = require("express");
const router = express.Router();
const productController = require("./products.controller");
const uploadController = require("../uploads/product.uploads");
const upload = require("../../middleware/uploads.middleware");

router.get("/", productController.getProducts);
router.get("/:productId", productController.getProductById);
router.post("/", productController.createProduct);
router.post(
  "/upload-image",
  upload.single("file"),
  uploadController.uploadImage
);
router.put("/:productId", productController.updateProduct);
router.patch("/:productId/stock", productController.updateProductStock);
router.delete("/:productId", productController.deactivateProduct);
router.delete("/delete-image", uploadController.deleteImage);

module.exports = router;

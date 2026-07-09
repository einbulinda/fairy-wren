const express = require("express");
const multer = require("multer");
const controller = require("./products.controller");
const { requirePermission } = require("../../middleware/rbac.middleware");

const router = express.Router();

const imgUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});

router.get("/", controller.listProducts);
router.post("/", requirePermission("manage_products"), controller.createProduct);

// Sub-resource routes must come before /:productId
router.post("/:productId/image", requirePermission("manage_products"), imgUpload.single("image"), controller.uploadProductImage);
router.delete("/:productId/image", requirePermission("manage_products"), controller.removeProductImage);
router.get("/:productId/purchases", controller.getProductPurchaseHistory);
router.get("/:productId/sales", controller.getProductSalesHistory);
router.get("/:productId/insights", controller.getProductInsights);
router.get("/:productId/statement", controller.getProductStatement);

router.get("/:productId", controller.getProduct);
router.put("/:productId", requirePermission("manage_products"), controller.updateProduct);
router.patch("/:productId/status", requirePermission("manage_products"), controller.updateProductStatus);
router.delete("/:productId", requirePermission("manage_products"), controller.archiveProduct);

module.exports = router;
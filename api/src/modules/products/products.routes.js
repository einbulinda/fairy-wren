const express = require("express");
const controller = require("./products.controller");

const router = express.Router();

router.get("/", controller.listProducts);
router.post("/", controller.createProduct);

// Sub-resource routes must come before /:productId
router.get("/:productId/purchases", controller.getProductPurchaseHistory);
router.get("/:productId/sales", controller.getProductSalesHistory);
router.get("/:productId/insights", controller.getProductInsights);

router.get("/:productId", controller.getProduct);
router.put("/:productId", controller.updateProduct);
router.patch("/:productId/status", controller.updateProductStatus);
router.delete("/:productId", controller.archiveProduct);

module.exports = router;
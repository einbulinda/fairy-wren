const express = require("express");
const controller = require("./products.controller");

const router = express.Router();

router.get("/", controller.listProducts);
router.post("/", controller.createProduct);

router.get("/:productId", controller.getProduct);
router.put("/:productId", controller.updateProduct);
router.patch("/:productId/status", controller.updateProductStatus);
router.delete("/:productId", controller.archiveProduct);

module.exports = router;

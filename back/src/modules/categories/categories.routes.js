const express = require("express");
const router = express.Router();
const categoryController = require("./categories.controller");

router.get("/", categoryController.fetchCategories);
router.get("/:categoryId", categoryController.fetchCategory);
router.post("/", categoryController.createCategory);
router.patch("/:categoryId", categoryController.updateCategory);
router.patch("/:categoryId/status-update", categoryController.toggleStatus);

module.exports = router;

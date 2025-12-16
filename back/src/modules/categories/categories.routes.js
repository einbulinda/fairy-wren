const express = require("express");
const router = express.Router();
const categoryController = require("./categories.controller");

router.get("/", categoryController.fetchCategories);
router.post("/", categoryController.createCategory);

module.exports = router;

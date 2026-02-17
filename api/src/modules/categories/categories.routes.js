const express = require("express");
const controller = require("./categories.controller");

const router = express.Router();

router.get("/", controller.listCategories);
router.post("/", controller.createCategory);

router.get("/:id", controller.getCategory);
router.patch("/:id", controller.updateCategory);
router.delete("/:id", controller.archiveCategory);

module.exports = router;

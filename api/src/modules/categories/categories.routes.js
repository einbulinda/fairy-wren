const express = require("express");
const controller = require("./categories.controller");
const { requirePermission } = require("../../middleware/rbac.middleware");

const router = express.Router();

router.get("/", controller.listCategories);
router.post("/", requirePermission("manage_categories"), controller.createCategory);

router.get("/:id", controller.getCategory);
router.patch("/:id", requirePermission("manage_categories"), controller.updateCategory);
router.delete("/:id", requirePermission("manage_categories"), controller.archiveCategory);

module.exports = router;

const express = require("express");
const controller = require("./system-roles.controller");
const { requireRole } = require("../../middleware/rbac.middleware");

const router = express.Router();

router.get("/", controller.listAll);
router.post("/", requireRole("owner"), controller.create);
router.put("/:code", requireRole("owner"), controller.update);
router.delete("/:code", requireRole("owner"), controller.remove);

module.exports = router;

const express = require("express");
const controller = require("./users.controller");
const { requireRole } = require("../../middleware/rbac.middleware");

const router = express.Router();

// Collection
router.get("/", requireRole("manager", "owner"), controller.listUsers);
router.post("/", requireRole("manager", "owner"), controller.createUser);

// Resource
router.get("/:userId", requireRole("manager", "owner"), controller.getUser);
router.put("/:userId", requireRole("manager", "owner"), controller.updateUser);

// Explicit sub-resources (VERY IMPORTANT)
router.patch("/:userId/status", requireRole("manager", "owner"), controller.updateUserStatus);
router.patch("/:userId/role", requireRole("owner"), controller.updateUserRole);

// Soft delete (Archive)
router.delete("/:userId", requireRole("owner"), controller.archiveUser);

module.exports = router;

const express = require("express");
const controller = require("./users.controller");

const router = express.Router();

// Collection
router.get("/", controller.listUsers);
router.post("/", controller.createUser);

// Resource
router.get("/:userId", controller.getUser);
router.patch("/:userId", controller.updateUser);

// Explicit sub-resources (VERY IMPORTANT)
router.patch("/:userId/status", controller.updateUserStatus);
router.patch("/:userId/role", controller.updateUserRole);

// Soft delete (Archive)
router.delete("/:userId", controller.archiveUser);

module.exports = router;

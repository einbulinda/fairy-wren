const express = require("express");
const router = express.Router();
const usersController = require("./users.controller");

router.get("/", usersController.getUsers);
router.get("/:userId", usersController.getUserById);
router.post("/", usersController.createUser);
router.patch("/:userId", usersController.updateUser);
router.delete("/:userId", usersController.deactivateUser);

module.exports = router;

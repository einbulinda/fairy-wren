const express = require("express");
const router = express.Router();
const usersController = require("./users.controller");

router.get("/", usersController.getUsers);
router.post("/", usersController.createUser);
router.patch("/:userId", usersController.updateUser);

module.exports = router;

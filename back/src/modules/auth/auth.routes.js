const express = require("express");
const controller = require("./auth.controller");
const authRateLimiter = require("../../middleware/authRateLimiter");

const router = express.Router();

router.post("/login", authRateLimiter, controller.login);
router.get("/me", controller.me);

module.exports = router;

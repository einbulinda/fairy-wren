const express = require("express");
const controller = require("./auth.controller");
const authRateLimiter = require("../../middleware/authRateLimiter");
const authMiddleware = require("../../middleware/auth.middleware");

const router = express.Router();

router.post("/login", authRateLimiter, controller.login);
router.get("/me", authMiddleware, controller.me);

module.exports = router;

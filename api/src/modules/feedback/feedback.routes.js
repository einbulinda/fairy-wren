const express = require("express");
const router = express.Router();
const controller = require("./feedback.controller");

router.get("/", controller.list);
router.patch("/:id/read", controller.markRead);
router.patch("/:id/archive", controller.archive);

module.exports = router;

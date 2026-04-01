const express = require("express");
const router = express.Router();
const controller = require("./reservations.controller");

router.get("/", controller.list);
router.patch("/:id/status", controller.updateStatus);

module.exports = router;

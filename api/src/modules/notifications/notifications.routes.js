const express = require("express");
const router = express.Router();
const controller = require("./notifications.controller");

router.get("/viewed-ids", controller.getViewedIds);
router.post("/mark-viewed", controller.markViewed);

module.exports = router;

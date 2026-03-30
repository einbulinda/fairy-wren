const express = require("express");
const router = express.Router();
const controller = require("./public.controller");

// No authentication required — public endpoints
router.get("/events", controller.getEvents);
router.get("/gallery", controller.getGallery);
router.post("/feedback", controller.submitFeedback);

module.exports = router;

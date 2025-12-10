const express = require("express");
const router = express.Router();
const reportsController = require("./reports.controller");

router.get("/", reportsController.salesReport);

module.exports = router;

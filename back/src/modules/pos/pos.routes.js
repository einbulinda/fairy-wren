const express = require("express");
const controller = require("./pos.controller");

const router = express.Router();

router.get("/bootstrap", controller.bootstrap);

module.exports = router;

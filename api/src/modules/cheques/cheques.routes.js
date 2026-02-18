const express = require("express");
const controller = require("./cheques.controller");

const router = express.Router();

router.get("/", controller.listCheques);
router.post("/", controller.createCheque);
router.get("/:chequeId", controller.getCheque);
router.patch("/:chequeId/clear", controller.clearCheque);
router.patch("/:chequeId/void", controller.voidCheque);

module.exports = router;

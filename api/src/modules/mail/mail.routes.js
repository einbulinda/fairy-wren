const express = require("express");
const controller = require("./mail.controller");

const router = express.Router();

router.get("/inbox", controller.listInbox);
router.get("/:uid", controller.getMessage);
router.patch("/:uid/read", controller.setRead);
router.delete("/:uid", controller.deleteMessage);
router.post("/send", controller.sendMail);

module.exports = router;

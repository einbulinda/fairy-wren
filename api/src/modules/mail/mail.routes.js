const express = require("express");
const controller = require("./mail.controller");

const router = express.Router();

// Named routes — must be before /:uid
router.get("/inbox", controller.listInbox);
router.get("/sent", controller.listSent);
router.get("/drafts", controller.listDrafts);
router.post("/drafts", controller.saveDraft);
router.post("/send", controller.sendMail);

// Parameterised routes
router.get("/:uid", controller.getMessage);         // ?folder=Sent|Drafts|INBOX
router.patch("/:uid/read", controller.setRead);
router.delete("/:uid", controller.deleteMessage);   // ?folder=...

module.exports = router;

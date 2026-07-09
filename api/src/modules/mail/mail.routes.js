const express = require("express");
const multer = require("multer");
const controller = require("./mail.controller");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB per file
});

const router = express.Router();

// Named routes — must be before /:uid
router.get("/mailboxes", controller.listMailboxes);
router.get("/inbox",  controller.listInbox);
router.get("/sent",   controller.listSent);
router.get("/drafts", controller.listDrafts);
router.post("/drafts", controller.saveDraft);
router.post("/send", upload.array("attachments", 10), controller.sendMail);

// Parameterised routes
router.get("/:uid/attachments/:index", controller.downloadAttachment); // ?folder=&mailbox=
router.get("/:uid", controller.getMessage);         // ?folder=Sent|Drafts|INBOX
router.patch("/:uid/read", controller.setRead);
router.delete("/:uid", controller.deleteMessage);   // ?folder=...

module.exports = router;

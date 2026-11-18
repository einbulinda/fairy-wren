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
// Sending with attachments (upload + SMTP hand-off) can take longer than the
// global 30 s request timeout, which would answer 503 while the mail may still
// go out. For this route the SMTP client's own limits apply instead
// (connect 15 s, idle socket 90 s — see mail.config.js).
const noGlobalTimeout = (req, _res, next) => {
  req.clearTimeout?.();
  next();
};

router.post("/send", noGlobalTimeout, upload.array("attachments", 10), controller.sendMail);

// Parameterised routes
router.get("/:uid/attachments/:index", controller.downloadAttachment); // ?folder=&mailbox=
router.get("/:uid", controller.getMessage);         // ?folder=Sent|Drafts|INBOX
router.patch("/:uid/read", controller.setRead);
router.delete("/:uid", controller.deleteMessage);   // ?folder=...

module.exports = router;

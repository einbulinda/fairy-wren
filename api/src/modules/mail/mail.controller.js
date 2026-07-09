const imap = require("./mail.imap");
const smtp = require("./mail.smtp");
const { respond } = require("../../utils/common");

exports.listInbox = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const data = await imap.listInbox({ page, limit });
    res.set("Cache-Control", "private, max-age=10");
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.listSent = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const data = await imap.listSent({ page, limit });
    res.set("Cache-Control", "private, max-age=15");
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.listDrafts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const data = await imap.listDrafts({ page, limit });
    res.set("Cache-Control", "private, max-age=10");
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getMessage = async (req, res, next) => {
  try {
    const uid = parseInt(req.params.uid);
    const folder = req.query.folder || "INBOX";
    if (!uid) return res.status(400).json({ success: false, message: "Invalid UID" });
    const msg = await imap.getMessage(uid, folder);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });
    respond(res, 200, msg);
  } catch (err) {
    next(err);
  }
};

exports.setRead = async (req, res, next) => {
  try {
    const uid = parseInt(req.params.uid);
    const seen = req.body.seen !== false;
    await imap.setRead(uid, seen);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const uid = parseInt(req.params.uid);
    const folder = req.query.folder || "INBOX";
    await imap.deleteMessage(uid, folder);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.saveDraft = async (req, res, next) => {
  try {
    const { uid, to, cc, subject, text } = req.body;
    await imap.saveDraft({ uid: uid ? parseInt(uid) : null, to, cc, subject, text });
    respond(res, 200, { saved: true });
  } catch (err) {
    next(err);
  }
};

exports.sendMail = async (req, res, next) => {
  try {
    const { to, cc, subject, text, html, replyTo } = req.body;
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ success: false, message: "to, subject, and body are required" });
    }
    const attachments = (req.files || []).map((f) => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype,
    }));
    const result = await smtp.sendMail({ to, cc, subject, text, html, replyTo, attachments });
    respond(res, 200, result);
  } catch (err) {
    next(err);
  }
};

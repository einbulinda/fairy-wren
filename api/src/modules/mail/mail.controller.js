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

exports.getMessage = async (req, res, next) => {
  try {
    const uid = parseInt(req.params.uid);
    if (!uid) return res.status(400).json({ success: false, message: "Invalid UID" });
    const msg = await imap.getMessage(uid);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });
    respond(res, 200, msg);
  } catch (err) {
    next(err);
  }
};

exports.setRead = async (req, res, next) => {
  try {
    const uid = parseInt(req.params.uid);
    const seen = req.body.seen !== false; // default true
    await imap.setRead(uid, seen);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const uid = parseInt(req.params.uid);
    await imap.deleteMessage(uid);
    res.status(204).send();
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
    const result = await smtp.sendMail({ to, cc, subject, text, html, replyTo });
    respond(res, 200, result);
  } catch (err) {
    next(err);
  }
};

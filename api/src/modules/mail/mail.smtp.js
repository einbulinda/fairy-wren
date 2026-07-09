const nodemailer = require("nodemailer");
const cfg = require("./mail.config");

let _transporter;
const transporter = () => {
  if (!_transporter) _transporter = nodemailer.createTransport(cfg.smtp);
  return _transporter;
};

exports.sendMail = async ({ to, cc, subject, text, html, replyTo }) => {
  const info = await transporter().sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to,
    cc: cc || undefined,
    replyTo: replyTo || undefined,
    subject,
    text,
    html: html || undefined,
  });
  return { messageId: info.messageId, accepted: info.accepted };
};

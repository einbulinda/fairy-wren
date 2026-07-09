const nodemailer = require("nodemailer");
const getConfig = require("./mail.config");
const { appendSent } = require("./mail.imap");

exports.sendMail = async ({ to, cc, subject, text, html, replyTo }) => {
  const cfg = getConfig();
  const transporter = nodemailer.createTransport(cfg.smtp);
  const info = await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to,
    cc: cc || undefined,
    replyTo: replyTo || undefined,
    subject,
    text,
    html: html || undefined,
  });

  // Save a copy to the Sent IMAP folder (fire-and-forget, don't block response)
  appendSent({ to, cc, subject, text, html }).catch(() => {});

  return { messageId: info.messageId, accepted: info.accepted };
};

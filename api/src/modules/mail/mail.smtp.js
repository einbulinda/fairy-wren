const nodemailer = require("nodemailer");
const getConfig = require("./mail.config");
const { appendSent } = require("./mail.imap");

exports.sendMail = async ({ to, cc, subject, text, html, replyTo, attachments = [], mailbox = "admin" }) => {
  const cfg = getConfig(mailbox);
  const transporter = nodemailer.createTransport(cfg.smtp);
  const info = await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to,
    cc:      cc      || undefined,
    replyTo: replyTo || undefined,
    subject,
    text,
    html:        html        || undefined,
    attachments: attachments.length ? attachments : undefined,
  });

  // Save copy to Sent folder (fire-and-forget)
  appendSent({ to, cc, subject, text, html }, mailbox).catch(() => {});

  return { messageId: info.messageId, accepted: info.accepted };
};

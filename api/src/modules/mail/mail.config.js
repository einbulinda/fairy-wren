const MAIL_HOST = process.env.MAIL_HOST || "mail.fairywren.co.ke";
const MAIL_USER = process.env.MAIL_USER || "admin@fairywren.co.ke";
const MAIL_PASS = process.env.MAIL_PASSWORD;

module.exports = {
  imap: {
    host: MAIL_HOST,
    port: 993,
    secure: true,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
    logger: false,
    disableAutoIdle: true,
  },
  smtp: {
    host: MAIL_HOST,
    port: 465,
    secure: true,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
  },
  fromAddress: MAIL_USER,
  fromName: "Fairy Wren Admin",
};

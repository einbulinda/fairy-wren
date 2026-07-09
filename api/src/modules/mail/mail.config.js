const HOST = () => process.env.MAIL_HOST || "mail.fairywren.co.ke";

const MAILBOXES = {
  admin: {
    label: "Admin",
    user: () => process.env.MAIL_USER      || "admin@fairywren.co.ke",
    pass: () => process.env.MAIL_PASSWORD,
  },
  info: {
    label: "Info",
    user: () => process.env.MAIL_INFO_USER || "info@fairywren.co.ke",
    pass: () => process.env.MAIL_INFO_PASSWORD,
  },
};

const cfg = (mailbox = "admin") => {
  const mb = MAILBOXES[mailbox] ?? MAILBOXES.admin;
  const host = HOST();
  const user = mb.user();
  const pass = mb.pass();
  return {
    imap: { host, port: 993, secure: true, auth: { user, pass }, logger: false, disableAutoIdle: true },
    smtp: { host, port: 465, secure: true, auth: { user, pass } },
    fromAddress: user,
    fromName: `Fairy Wren ${mb.label}`,
    mailbox,
  };
};

module.exports = cfg;
module.exports.MAILBOXES = MAILBOXES;

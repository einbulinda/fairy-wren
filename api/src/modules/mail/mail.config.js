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

/**
 * SMTP port/security are configurable because some hosting providers block
 * outbound 465 but allow 587 (or vice versa):
 *   MAIL_SMTP_PORT=465  (default, implicit TLS)
 *   MAIL_SMTP_PORT=587  (STARTTLS — secure is derived as false unless MAIL_SMTP_SECURE=true)
 */
const smtpPort = () => parseInt(process.env.MAIL_SMTP_PORT, 10) || 465;
const smtpSecure = (port) =>
  process.env.MAIL_SMTP_SECURE != null ? process.env.MAIL_SMTP_SECURE === "true" : port === 465;

const cfg = (mailbox = "admin") => {
  const mb = MAILBOXES[mailbox] ?? MAILBOXES.admin;
  const host = HOST();
  const user = mb.user();
  const pass = mb.pass();
  const port = smtpPort();
  return {
    imap: { host, port: 993, secure: true, auth: { user, pass }, logger: false, disableAutoIdle: true },
    smtp: {
      host,
      port,
      secure: smtpSecure(port),
      requireTLS: !smtpSecure(port), // never send credentials in clear text on 587/25
      auth: { user, pass },
      // Fail fast instead of nodemailer's 2-minute default, so the user gets a
      // clear error well inside the API's request timeout.
      connectionTimeout: 15 * 1000,
      greetingTimeout: 15 * 1000,
      // Time allowed between socket activity — generous for large attachments.
      socketTimeout: 90 * 1000,
    },
    fromAddress: user,
    fromName: `Fairy Wren ${mb.label}`,
    mailbox,
  };
};

module.exports = cfg;
module.exports.MAILBOXES = MAILBOXES;

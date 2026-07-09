const cfg = () => {
  const host = process.env.MAIL_HOST || "mail.fairywren.co.ke";
  const user = process.env.MAIL_USER || "admin@fairywren.co.ke";
  const pass = process.env.MAIL_PASSWORD;
  return {
    imap: { host, port: 993, secure: true, auth: { user, pass }, logger: false, disableAutoIdle: true },
    smtp: { host, port: 465, secure: true, auth: { user, pass } },
    fromAddress: user,
    fromName: "Fairy Wren Admin",
  };
};

module.exports = cfg;

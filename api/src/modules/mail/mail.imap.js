const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const MailComposer = require("nodemailer/lib/mail-composer");
const getConfig = require("./mail.config");

const mkClient = (mailbox) => new ImapFlow(getConfig(mailbox).imap);

const buildMime = (options) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const stream = new MailComposer(options).compile().createReadStream();
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });

// ── Generic folder listing ────────────────────────────────────────────────

const listFolder = async (folder, { page = 1, limit = 50, mailbox = "admin" } = {}) => {
  const client = mkClient(mailbox);
  await client.connect();
  try {
    const mbox = await client.mailboxOpen(folder);
    const total = mbox.exists;
    if (total === 0) return { messages: [], total: 0, unread: 0 };

    const end = total - (page - 1) * limit;
    const start = Math.max(1, end - limit + 1);

    const messages = [];
    for await (const msg of client.fetch(`${start}:${end}`, {
      envelope: true,
      flags: true,
      uid: true,
    })) {
      const from = msg.envelope.from?.[0] ?? {};
      const to   = msg.envelope.to?.[0]   ?? {};
      messages.push({
        uid: msg.uid,
        seq: msg.seq,
        subject: msg.envelope.subject || "(no subject)",
        from: { name: from.name || null, address: from.address || null },
        to:   { name: to.name   || null, address: to.address   || null },
        date: msg.envelope.date,
        seen:  msg.flags.has("\\Seen"),
        draft: msg.flags.has("\\Draft"),
      });
    }

    let unread = 0;
    if (folder === "INBOX") {
      for await (const msg of client.fetch("1:*", { flags: true })) {
        if (!msg.flags.has("\\Seen")) unread++;
      }
    }

    return { messages: messages.reverse(), total, unread };
  } finally {
    await client.logout();
  }
};

// ── Public folder operations ──────────────────────────────────────────────

exports.listInbox  = (opts) => listFolder("INBOX",  opts);
exports.listSent   = (opts) => listFolder("Sent",   opts);
exports.listDrafts = (opts) => listFolder("Drafts", opts);

exports.getMessage = async (uid, folder = "INBOX", mailbox = "admin") => {
  const client = mkClient(mailbox);
  await client.connect();
  try {
    await client.mailboxOpen(folder);
    if (folder !== "Drafts") {
      await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
    }

    const raw = await client.fetchOne(String(uid), { source: true }, { uid: true });
    if (!raw) return null;

    const parsed = await simpleParser(raw.source);
    const addrList = (arr) =>
      (arr?.value || []).map((a) => ({ name: a.name || null, address: a.address }));

    return {
      uid,
      folder,
      subject: parsed.subject || "(no subject)",
      from: addrList(parsed.from)[0] || null,
      to:   addrList(parsed.to),
      cc:   addrList(parsed.cc),
      date: parsed.date,
      text: parsed.text || null,
      html: parsed.html || null,
      attachments: (parsed.attachments || []).map((a) => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
      })),
      seen: folder !== "Drafts",
    };
  } finally {
    await client.logout();
  }
};

exports.setRead = async (uid, seen, folder = "INBOX", mailbox = "admin") => {
  const client = mkClient(mailbox);
  await client.connect();
  try {
    await client.mailboxOpen(folder);
    if (seen) {
      await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
    } else {
      await client.messageFlagsRemove({ uid }, ["\\Seen"], { uid: true });
    }
  } finally {
    await client.logout();
  }
};

exports.deleteMessage = async (uid, folder = "INBOX", mailbox = "admin") => {
  const client = mkClient(mailbox);
  await client.connect();
  try {
    await client.mailboxOpen(folder);
    await client.messageDelete({ uid }, { uid: true });
  } finally {
    await client.logout();
  }
};

exports.appendSent = async (mailOptions, mailbox = "admin") => {
  const cfg = getConfig(mailbox);
  const client = mkClient(mailbox);
  await client.connect();
  try {
    const raw = await buildMime({
      ...mailOptions,
      from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    });
    await client.append("Sent", raw, ["\\Seen"]);
  } finally {
    await client.logout();
  }
};

exports.getAttachment = async (uid, index, folder = "INBOX", mailbox = "admin") => {
  const client = mkClient(mailbox);
  await client.connect();
  try {
    await client.mailboxOpen(folder);
    const raw = await client.fetchOne(String(uid), { source: true }, { uid: true });
    if (!raw) return null;
    const parsed = await simpleParser(raw.source);
    const att = parsed.attachments?.[index];
    if (!att) return null;
    return {
      filename: att.filename || `attachment-${index}`,
      contentType: att.contentType || "application/octet-stream",
      content: att.content, // Buffer
    };
  } finally {
    await client.logout();
  }
};

exports.saveDraft = async ({ uid, to, cc, subject, text, mailbox = "admin" }) => {
  const cfg = getConfig(mailbox);
  const client = mkClient(mailbox);
  await client.connect();
  try {
    await client.mailboxOpen("Drafts");
    if (uid) {
      try { await client.messageDelete({ uid }, { uid: true }); } catch { /* gone */ }
    }
    const raw = await buildMime({
      from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
      to:      to      || undefined,
      cc:      cc      || undefined,
      subject: subject || "(no subject)",
      text:    text    || " ",
    });
    await client.append("Drafts", raw, ["\\Draft", "\\Seen"]);
  } finally {
    await client.logout();
  }
};

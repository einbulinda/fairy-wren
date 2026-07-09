const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const MailComposer = require("nodemailer/lib/mail-composer");
const getConfig = require("./mail.config");

const mkClient = () => new ImapFlow(getConfig().imap);

const buildMime = (options) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const stream = new MailComposer(options).compile().createReadStream();
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });

// ── Generic folder listing ────────────────────────────────────────────────

const listFolder = async (folder, { page = 1, limit = 50 } = {}) => {
  const client = mkClient();
  await client.connect();
  try {
    const mailbox = await client.mailboxOpen(folder);
    const total = mailbox.exists;
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
      const to = msg.envelope.to?.[0] ?? {};
      messages.push({
        uid: msg.uid,
        seq: msg.seq,
        subject: msg.envelope.subject || "(no subject)",
        from: { name: from.name || null, address: from.address || null },
        to: { name: to.name || null, address: to.address || null },
        date: msg.envelope.date,
        seen: msg.flags.has("\\Seen"),
        draft: msg.flags.has("\\Draft"),
      });
    }

    // Unread count for inbox only (skip for sent/drafts)
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

exports.listInbox = (opts) => listFolder("INBOX", opts);
exports.listSent  = (opts) => listFolder("Sent", opts);
exports.listDrafts = (opts) => listFolder("Drafts", opts);

// Fetch full message from any folder; marks read (skip for drafts)
exports.getMessage = async (uid, folder = "INBOX") => {
  const client = mkClient();
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
      to: addrList(parsed.to),
      cc: addrList(parsed.cc),
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

// Toggle seen flag
exports.setRead = async (uid, seen, folder = "INBOX") => {
  const client = mkClient();
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

// Delete a message from any folder
exports.deleteMessage = async (uid, folder = "INBOX") => {
  const client = mkClient();
  await client.connect();
  try {
    await client.mailboxOpen(folder);
    await client.messageDelete({ uid }, { uid: true });
  } finally {
    await client.logout();
  }
};

// Append a sent copy to the Sent folder
exports.appendSent = async (mailOptions) => {
  const cfg = getConfig();
  const client = mkClient();
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

// Save / update a draft in the Drafts folder
exports.saveDraft = async ({ uid, to, cc, subject, text }) => {
  const cfg = getConfig();
  const client = mkClient();
  await client.connect();
  try {
    await client.mailboxOpen("Drafts");
    // Delete existing draft if updating
    if (uid) {
      try {
        await client.messageDelete({ uid }, { uid: true });
      } catch {
        // already gone — ignore
      }
    }
    const raw = await buildMime({
      from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
      to: to || undefined,
      cc: cc || undefined,
      subject: subject || "(no subject)",
      text: text || " ",
    });
    await client.append("Drafts", raw, ["\\Draft", "\\Seen"]);
  } finally {
    await client.logout();
  }
};

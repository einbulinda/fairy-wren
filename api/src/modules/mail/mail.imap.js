const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const cfg = require("./mail.config");

const mkClient = () => new ImapFlow(cfg.imap);

// List messages in INBOX, newest first, paginated
exports.listInbox = async ({ page = 1, limit = 50, folder = "INBOX" } = {}) => {
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
      messages.push({
        uid: msg.uid,
        seq: msg.seq,
        subject: msg.envelope.subject || "(no subject)",
        from: { name: from.name || null, address: from.address || null },
        date: msg.envelope.date,
        seen: msg.flags.has("\\Seen"),
      });
    }

    // Count unseen in full mailbox
    let unread = 0;
    for await (const msg of client.fetch("1:*", { flags: true })) {
      if (!msg.flags.has("\\Seen")) unread++;
    }

    return { messages: messages.reverse(), total, unread };
  } finally {
    await client.logout();
  }
};

// Fetch full message and mark as read
exports.getMessage = async (uid, folder = "INBOX") => {
  const client = mkClient();
  await client.connect();
  try {
    await client.mailboxOpen(folder);
    await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });

    const raw = await client.fetchOne(String(uid), { source: true }, { uid: true });
    if (!raw) return null;

    const parsed = await simpleParser(raw.source);
    const addrList = (arr) =>
      (arr?.value || []).map((a) => ({ name: a.name || null, address: a.address }));

    return {
      uid,
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
      seen: true,
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

// Move to Trash / delete
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

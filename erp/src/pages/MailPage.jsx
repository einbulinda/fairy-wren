import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  RefreshCw,
  Mail,
  Send,
  Trash2,
  Reply,
  X,
  ChevronLeft,
  Loader2,
  Circle,
  Inbox,
  FileEdit,
  Paperclip,
  ChevronDown,
  Download,
} from "lucide-react";
import {
  fetchMailboxes,
  fetchInbox,
  fetchSent,
  fetchDrafts,
  fetchMessage,
  markRead,
  deleteMessage,
  saveDraft,
  sendMail,
  downloadAttachment,
} from "@/services/mail.service";

const DRAFT_KEY = "mail_compose_draft";

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  return isToday
    ? date.toLocaleTimeString("en-KE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Nairobi",
      })
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Nairobi",
      });
};

const addrLabel = (addr) => addr?.name || addr?.address || "Unknown";

// ─── Compose Modal ─────────────────────────────────────────────────────────

const ComposeModal = ({
  onClose,
  defaultTo = "",
  defaultSubject = "",
  defaultBody = "",
  draftUid = null,
  isReply = false,
  mailbox = "admin",
}) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => {
    if (!isReply && !defaultTo && !defaultSubject) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) return { cc: "", ...JSON.parse(saved) };
      } catch { /* corrupted */ }
    }
    return { to: defaultTo, cc: "", subject: defaultSubject, body: defaultBody };
  });
  const [files, setFiles] = useState([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // null | 'saving' | 'saved'
  const autoSaveTimer = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...picked.filter((f) => !existing.has(f.name + f.size))];
    });
    e.target.value = ""; // reset so same file can be re-added after removal
  };

  const removeFile = (idx) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const fmtSize = (bytes) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  // Auto-save to localStorage + server every 5s when form has content
  useEffect(() => {
    if (isReply) return;
    clearTimeout(autoSaveTimer.current);
    if (!form.to && !form.subject && !form.body) return;

    autoSaveTimer.current = setTimeout(async () => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setAutoSaveStatus("saving");
      try {
        await saveDraft({
          uid: draftUid || undefined,
          to: form.to,
          cc: form.cc,
          subject: form.subject,
          text: form.body,
        });
        setAutoSaveStatus("saved");
        qc.invalidateQueries({ queryKey: ["mail-drafts"] });
      } catch {
        setAutoSaveStatus(null); // server save failed — localStorage still has it
      }
    }, 5000);

    return () => clearTimeout(autoSaveTimer.current);
  }, [form, isReply, draftUid, qc]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setAutoSaveStatus(null);
  };

  const sendMutation = useMutation({
    mutationFn: () =>
      sendMail({
        to: form.to,
        cc: form.cc || undefined,
        subject: form.subject,
        text: form.body,
        files,
        mailbox,
      }),
    onSuccess: () => {
      localStorage.removeItem(DRAFT_KEY);
      // Delete draft from server if it was one
      if (draftUid) deleteMessage(draftUid, "Drafts").catch(() => {});
      toast.success("Email sent");
      qc.invalidateQueries({ queryKey: ["mail-sent"] });
      qc.invalidateQueries({ queryKey: ["mail-drafts"] });
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to send"),
  });

  const handleClose = () => {
    // Persist what we have to localStorage before closing
    if (!isReply && (form.to || form.subject || form.body)) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h2 className="font-semibold text-white">
            {isReply ? "Reply" : "Compose"}
          </h2>
          <div className="flex items-center gap-3">
            {autoSaveStatus === "saving" && (
              <span className="text-xs text-surface-500 flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Saving…
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="text-xs text-emerald-500">Draft saved</span>
            )}
            <button
              onClick={handleClose}
              className="text-surface-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            { label: "To", key: "to", placeholder: "recipient@example.com" },
            { label: "CC", key: "cc", placeholder: "optional" },
            { label: "Subject", key: "subject", placeholder: "Email subject" },
          ].map(({ label, key, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-surface-500 w-12 shrink-0">
                {label}
              </span>
              <input
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="flex-1 bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
          <div className="flex gap-3">
            <span className="text-xs text-surface-500 w-12 shrink-0 pt-2">
              Body
            </span>
            <textarea
              value={form.body}
              onChange={set("body")}
              rows={10}
              placeholder="Write your message…"
              className="flex-1 bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Attachment list */}
        {files.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-800 border border-surface-600 rounded-lg text-xs text-surface-300"
              >
                <Paperclip size={10} className="text-surface-500 shrink-0" />
                <span className="truncate max-w-[140px]">{f.name}</span>
                <span className="text-surface-600 shrink-0">
                  {fmtSize(f.size)}
                </span>
                <button
                  onClick={() => removeFile(i)}
                  className="text-surface-500 hover:text-red-400 transition-colors ml-0.5"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-surface-700">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-800"
            title="Attach files"
          >
            <Paperclip size={15} />
            <span className="hidden sm:inline">Attach</span>
            {files.length > 0 && (
              <span className="text-primary-400 font-medium">
                ({files.length})
              </span>
            )}
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={
                !form.to ||
                !form.subject ||
                !form.body ||
                sendMutation.isPending
              }
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {sendMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Message Detail ────────────────────────────────────────────────────────

const MessageDetail = ({
  uid,
  folder,
  mailbox = "admin",
  onBack,
  onDelete,
}) => {
  const qc = useQueryClient();
  const [composing, setComposing] = useState(null);

  const { data: msg, isLoading } = useQuery({
    queryKey: ["mail-message", uid, folder, mailbox],
    queryFn: () => fetchMessage(uid, folder, mailbox),
  });

  // Refresh the inbox list once the message loads so the unread dot clears
  useEffect(() => {
    if (msg && folder === "INBOX") {
      qc.invalidateQueries({ queryKey: ["mail-inbox"] });
    }
  }, [msg, folder, mailbox, qc]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteMessage(uid, folder, mailbox),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey:
          folder === "Sent"
            ? ["mail-sent"]
            : folder === "Drafts"
              ? ["mail-drafts"]
              : ["mail-inbox"],
      });
      if (folder === "Drafts") localStorage.removeItem(DRAFT_KEY);
      toast.success("Message deleted");
      onDelete();
    },
    onError: () => toast.error("Failed to delete"),
  });

  const markUnread = useMutation({
    mutationFn: () => markRead(uid, false, mailbox),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mail-inbox"] });
      onBack();
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-surface-400" />
      </div>
    );
  }
  if (!msg) return null;

  const isDraft = folder === "Drafts";
  const isSent = folder === "Sent";

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-700 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={14} />
            {isDraft ? "Drafts" : isSent ? "Sent" : "Inbox"}
          </button>
          <div className="flex-1" />
          {isDraft && (
            <button
              onClick={() =>
                setComposing({
                  to: msg.to?.[0]?.address,
                  subject: msg.subject,
                  body: msg.text,
                  draftUid: uid,
                })
              }
              className="flex items-center gap-1.5 text-xs bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              <FileEdit size={12} /> Edit draft
            </button>
          )}
          {!isDraft && !isSent && (
            <>
              <button
                onClick={() => markUnread.mutate()}
                className="text-xs text-surface-400 hover:text-white px-2 py-1 rounded transition-colors"
              >
                Mark unread
              </button>
              <button
                onClick={() =>
                  setComposing({
                    to: msg.from?.address,
                    subject: msg.subject?.startsWith("Re:")
                      ? msg.subject
                      : `Re: ${msg.subject}`,
                    isReply: true,
                  })
                }
                className="flex items-center gap-1.5 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                <Reply size={12} /> Reply
              </button>
            </>
          )}

          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>

        {/* Subject + meta */}
        <div className="px-6 py-4 border-b border-surface-700/50 shrink-0">
          <h2 className="text-lg font-semibold text-white mb-3">
            {msg.subject}
          </h2>
          <div className="space-y-1 text-sm">
            {msg.from && (
              <div className="flex gap-2">
                <span className="text-surface-500 w-10 shrink-0">From</span>
                <span className="text-white">
                  {msg.from.name && (
                    <span className="mr-1">{msg.from.name}</span>
                  )}
                  <span className="text-surface-400">
                    &lt;{msg.from.address}&gt;
                  </span>
                </span>
              </div>
            )}
            {msg.to?.length > 0 && (
              <div className="flex gap-2">
                <span className="text-surface-500 w-10 shrink-0">To</span>
                <span className="text-surface-300">
                  {msg.to.map((a) => a.address).join(", ")}
                </span>
              </div>
            )}
            {msg.cc?.length > 0 && (
              <div className="flex gap-2">
                <span className="text-surface-500 w-10 shrink-0">CC</span>
                <span className="text-surface-300">
                  {msg.cc.map((a) => a.address).join(", ")}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-surface-500 w-10 shrink-0">Date</span>
              <span className="text-surface-400 text-xs">
                {new Date(msg.date).toLocaleString("en-KE", {
                  timeZone: "Africa/Nairobi",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {msg.html ? (
            <iframe
              srcDoc={msg.html}
              sandbox="allow-same-origin"
              className="w-full border-0 bg-white rounded-lg"
              style={{ minHeight: "400px" }}
              title="Email body"
            />
          ) : (
            <pre className="text-sm text-surface-300 whitespace-pre-wrap font-sans leading-relaxed">
              {msg.text}
            </pre>
          )}

          {msg.attachments?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-surface-700">
              <p className="text-xs text-surface-500 mb-2 uppercase tracking-wide">
                Attachments
              </p>
              <div className="flex flex-wrap gap-2">
                {msg.attachments.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => downloadAttachment(uid, i, a.filename, folder, mailbox)}
                    className="flex items-center gap-2 px-3 py-2 bg-surface-800 hover:bg-surface-700 border border-surface-600 rounded-lg text-xs text-surface-300 transition-colors"
                  >
                    <Paperclip className="w-3 h-3 text-surface-500" />
                    <span>{a.filename}</span>
                    <span className="text-surface-600">({Math.round(a.size / 1024)} KB)</span>
                    <Download className="w-3 h-3 text-primary-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {composing && (
        <ComposeModal
          defaultTo={composing.to}
          defaultSubject={composing.subject}
          defaultBody={composing.body}
          draftUid={composing.draftUid}
          isReply={composing.isReply}
          mailbox={mailbox}
          onClose={() => setComposing(null)}
        />
      )}
    </>
  );
};

// ─── Message Row ───────────────────────────────────────────────────────────

const MessageRow = ({ msg, isSelected, onClick, showTo = false }) => (
  <button
    onClick={onClick}
    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-surface-800 transition-colors
      ${isSelected ? "bg-primary-600/10 border-l-2 border-l-primary-500" : "hover:bg-surface-800/50"}
    `}
  >
    <div className="mt-1 shrink-0 w-2">
      {!msg.seen && !showTo && (
        <Circle size={8} className="fill-primary-400 text-primary-400" />
      )}
      {msg.draft && <FileEdit size={10} className="text-amber-400" />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-sm truncate ${!msg.seen && !showTo ? "font-semibold text-white" : "text-surface-300"}`}
        >
          {showTo ? addrLabel(msg.to) : addrLabel(msg.from)}
        </span>
        <span className="text-xs text-surface-500 shrink-0">
          {fmtDate(msg.date)}
        </span>
      </div>
      <p
        className={`text-xs mt-0.5 truncate ${!msg.seen && !showTo ? "text-surface-300" : "text-surface-500"}`}
      >
        {msg.draft && <span className="text-amber-400 mr-1">[Draft]</span>}
        {msg.subject}
      </p>
    </div>
  </button>
);

// ─── Message List (shared for all three folders) ───────────────────────────

const MessageList = ({
  queryKey,
  queryFn,
  folder,
  showTo = false,
  emptyText = "No messages",
  mailbox = "admin",
}) => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedUid, setSelectedUid] = useState(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [queryKey, page, mailbox],
    queryFn: () => queryFn({ page, limit: 50, mailbox }),
    staleTime: 60 * 1000,
    refetchInterval: folder === "INBOX" ? 2 * 60 * 1000 : false,
  });

  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;
  const unread = data?.unread ?? 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* List */}
      <div
        className={`${selectedUid ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-surface-700 overflow-hidden shrink-0`}
      >
        {/* List sub-toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-700/50 shrink-0">
          {unread > 0 && (
            <span className="text-xs text-primary-400 font-medium">
              {unread} unread
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1 text-surface-500 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-surface-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <Mail size={32} className="text-surface-700 mb-3" />
            <p className="text-surface-500 text-sm">{emptyText}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {messages.map((msg) => (
                <MessageRow
                  key={msg.uid}
                  msg={msg}
                  isSelected={msg.uid === selectedUid}
                  onClick={() => setSelectedUid(msg.uid)}
                  showTo={showTo}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-surface-700 text-xs text-surface-500">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="disabled:opacity-40 hover:text-white transition-colors"
                >
                  ← Newer
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="disabled:opacity-40 hover:text-white transition-colors"
                >
                  Older →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail */}
      {selectedUid ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <MessageDetail
            uid={selectedUid}
            folder={folder}
            mailbox={mailbox}
            onBack={() => setSelectedUid(null)}
            onDelete={() => setSelectedUid(null)}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-center">
          <div>
            <Mail size={40} className="mx-auto mb-3 text-surface-700" />
            <p className="text-surface-500 text-sm">Select a message to read</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────

const TABS = [
  {
    id: "inbox",
    label: "Inbox",
    icon: Inbox,
    folder: "INBOX",
    queryKey: "mail-inbox",
    fn: fetchInbox,
    emptyText: "Inbox is empty",
  },
  {
    id: "sent",
    label: "Sent",
    icon: Send,
    folder: "Sent",
    queryKey: "mail-sent",
    fn: fetchSent,
    emptyText: "No sent messages",
    showTo: true,
  },
  {
    id: "drafts",
    label: "Drafts",
    icon: FileEdit,
    folder: "Drafts",
    queryKey: "mail-drafts",
    fn: fetchDrafts,
    emptyText: "No saved drafts",
  },
];

const MailPage = () => {
  const [activeTab, setActiveTab] = useState("inbox");
  const [mailbox, setMailbox] = useState("admin");
  const [composing, setComposing] = useState(false);
  const [mbDropOpen, setMbDropOpen] = useState(false);

  const tab = TABS.find((t) => t.id === activeTab);

  const { data: mailboxes = [] } = useQuery({
    queryKey: ["mail-mailboxes"],
    queryFn: fetchMailboxes,
    staleTime: Infinity,
  });

  const activeMb = mailboxes.find((m) => m.id === mailbox);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-700 bg-surface-900/40 shrink-0 flex-wrap">
        {/* Mailbox switcher */}
        {mailboxes.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setMbDropOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-800 hover:bg-surface-700 border border-surface-600 rounded-lg text-sm text-white transition-colors"
            >
              <Mail size={13} className="text-primary-400 shrink-0" />
              <span className="max-w-[140px] truncate">
                {activeMb?.user ?? mailbox}
              </span>
              <ChevronDown size={12} className="text-surface-500 shrink-0" />
            </button>
            {mbDropOpen && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-surface-800 border border-surface-600 rounded-xl shadow-xl min-w-[220px] overflow-hidden">
                {mailboxes.map((mb) => (
                  <button
                    key={mb.id}
                    onClick={() => {
                      setMailbox(mb.id);
                      setMbDropOpen(false);
                    }}
                    className={`w-full text-left flex flex-col px-4 py-3 hover:bg-surface-700 transition-colors border-b border-surface-700/50 last:border-0
                      ${mailbox === mb.id ? "bg-primary-600/10" : ""}`}
                  >
                    <span
                      className={`text-sm font-medium ${mailbox === mb.id ? "text-primary-400" : "text-white"}`}
                    >
                      {mb.label}
                    </span>
                    <span className="text-xs text-surface-400">{mb.user}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {mailboxes.length > 1 && <div className="w-px h-5 bg-surface-700" />}

        {/* Folder tabs */}
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${
                  activeTab === id
                    ? "bg-primary-600/20 text-primary-400"
                    : "text-surface-400 hover:text-white hover:bg-surface-800"
                }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Send size={13} /> Compose
        </button>
      </div>

      {/* Close dropdown on outside click */}
      {mbDropOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setMbDropOpen(false)}
        />
      )}

      {/* Active tab content */}
      <MessageList
        key={`${tab.id}-${mailbox}`}
        queryKey={tab.queryKey}
        queryFn={tab.fn}
        folder={tab.folder}
        showTo={tab.showTo}
        emptyText={tab.emptyText}
        mailbox={mailbox}
      />

      {composing && (
        <ComposeModal mailbox={mailbox} onClose={() => setComposing(false)} />
      )}
    </div>
  );
};

export default MailPage;

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Mail, Send, RefreshCw, Trash2, Reply, X, ChevronLeft,
  Loader2, Circle, Inbox, Clock, FileEdit,
} from "lucide-react";
import {
  fetchInbox, fetchSent, fetchDrafts,
  fetchMessage, markRead, deleteMessage,
  saveDraft, sendMail,
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
    ? date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
};

const addrLabel = (addr) => addr?.name || addr?.address || "Unknown";

// ─── Compose Modal ─────────────────────────────────────────────────────────

const ComposeModal = ({ onClose, defaultTo = "", defaultSubject = "", defaultBody = "", draftUid = null, isReply = false }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ to: defaultTo, cc: "", subject: defaultSubject, body: defaultBody });
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // null | 'saving' | 'saved'
  const autoSaveTimer = useRef(null);

  // Restore from localStorage on mount (only for new compose, not replies)
  useEffect(() => {
    if (!isReply && !defaultTo && !defaultSubject) {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        try { setForm(JSON.parse(saved)); } catch { /* corrupted */ }
      }
    }
  }, [isReply, defaultTo, defaultSubject]);

  // Auto-save to localStorage + server every 5s when form has content
  useEffect(() => {
    if (isReply) return;
    clearTimeout(autoSaveTimer.current);
    if (!form.to && !form.subject && !form.body) return;

    autoSaveTimer.current = setTimeout(async () => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setAutoSaveStatus("saving");
      try {
        await saveDraft({ uid: draftUid || undefined, to: form.to, cc: form.cc, subject: form.subject, text: form.body });
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
    mutationFn: () => sendMail({ to: form.to, cc: form.cc || undefined, subject: form.subject, text: form.body }),
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
          <h2 className="font-semibold text-white">{isReply ? "Reply" : "Compose"}</h2>
          <div className="flex items-center gap-3">
            {autoSaveStatus === "saving" && (
              <span className="text-xs text-surface-500 flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Saving…
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="text-xs text-emerald-500">Draft saved</span>
            )}
            <button onClick={handleClose} className="text-surface-400 hover:text-white transition-colors">
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
              <span className="text-xs text-surface-500 w-12 shrink-0">{label}</span>
              <input
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="flex-1 bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
          <div className="flex gap-3">
            <span className="text-xs text-surface-500 w-12 shrink-0 pt-2">Body</span>
            <textarea
              value={form.body}
              onChange={set("body")}
              rows={10}
              placeholder="Write your message…"
              className="flex-1 bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-surface-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => sendMutation.mutate()}
            disabled={!form.to || !form.subject || !form.body || sendMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {sendMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Message Detail ────────────────────────────────────────────────────────

const MessageDetail = ({ uid, folder, onBack, onDelete }) => {
  const qc = useQueryClient();
  const [composing, setComposing] = useState(null); // null | { to, subject, isDraft, draftUid }

  const { data: msg, isLoading } = useQuery({
    queryKey: ["mail-message", uid, folder],
    queryFn: () => fetchMessage(uid, folder),
    onSuccess: () => {
      if (folder === "INBOX") qc.invalidateQueries({ queryKey: ["mail-inbox"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMessage(uid, folder),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: folder === "Sent" ? ["mail-sent"] : folder === "Drafts" ? ["mail-drafts"] : ["mail-inbox"] });
      if (folder === "Drafts") localStorage.removeItem(DRAFT_KEY);
      toast.success("Message deleted");
      onDelete();
    },
    onError: () => toast.error("Failed to delete"),
  });

  const markUnread = useMutation({
    mutationFn: () => markRead(uid, false),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mail-inbox"] }); onBack(); },
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
              onClick={() => setComposing({ to: msg.to?.[0]?.address, subject: msg.subject, body: msg.text, draftUid: uid })}
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
                onClick={() => setComposing({ to: msg.from?.address, subject: msg.subject?.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`, isReply: true })}
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
          <h2 className="text-lg font-semibold text-white mb-3">{msg.subject}</h2>
          <div className="space-y-1 text-sm">
            {msg.from && (
              <div className="flex gap-2">
                <span className="text-surface-500 w-10 shrink-0">From</span>
                <span className="text-white">
                  {msg.from.name && <span className="mr-1">{msg.from.name}</span>}
                  <span className="text-surface-400">&lt;{msg.from.address}&gt;</span>
                </span>
              </div>
            )}
            {msg.to?.length > 0 && (
              <div className="flex gap-2">
                <span className="text-surface-500 w-10 shrink-0">To</span>
                <span className="text-surface-300">{msg.to.map((a) => a.address).join(", ")}</span>
              </div>
            )}
            {msg.cc?.length > 0 && (
              <div className="flex gap-2">
                <span className="text-surface-500 w-10 shrink-0">CC</span>
                <span className="text-surface-300">{msg.cc.map((a) => a.address).join(", ")}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-surface-500 w-10 shrink-0">Date</span>
              <span className="text-surface-400 text-xs">{new Date(msg.date).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}</span>
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
              <p className="text-xs text-surface-500 mb-2 uppercase tracking-wide">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {msg.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-xs text-surface-300">
                    <span>{a.filename}</span>
                    <span className="text-surface-600">({Math.round(a.size / 1024)} KB)</span>
                  </div>
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
      {msg.draft && (
        <FileEdit size={10} className="text-amber-400" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm truncate ${(!msg.seen && !showTo) ? "font-semibold text-white" : "text-surface-300"}`}>
          {showTo ? addrLabel(msg.to) : addrLabel(msg.from)}
        </span>
        <span className="text-xs text-surface-500 shrink-0">{fmtDate(msg.date)}</span>
      </div>
      <p className={`text-xs mt-0.5 truncate ${(!msg.seen && !showTo) ? "text-surface-300" : "text-surface-500"}`}>
        {msg.draft && <span className="text-amber-400 mr-1">[Draft]</span>}
        {msg.subject}
      </p>
    </div>
  </button>
);

// ─── Message List (shared for all three folders) ───────────────────────────

const MessageList = ({ queryKey, queryFn, folder, showTo = false, emptyText = "No messages" }) => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedUid, setSelectedUid] = useState(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [queryKey, page],
    queryFn: () => queryFn({ page, limit: 50 }),
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
      <div className={`${selectedUid ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-surface-700 overflow-hidden shrink-0`}>
        {/* List sub-toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-700/50 shrink-0">
          {unread > 0 && (
            <span className="text-xs text-primary-400 font-medium">{unread} unread</span>
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
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40 hover:text-white transition-colors">
                  ← Newer
                </button>
                <span>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40 hover:text-white transition-colors">
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
  { id: "inbox",  label: "Inbox",  icon: Inbox,    folder: "INBOX",  queryKey: "mail-inbox",  fn: fetchInbox,  emptyText: "Inbox is empty" },
  { id: "sent",   label: "Sent",   icon: Send,     folder: "Sent",   queryKey: "mail-sent",   fn: fetchSent,   emptyText: "No sent messages", showTo: true },
  { id: "drafts", label: "Drafts", icon: FileEdit, folder: "Drafts", queryKey: "mail-drafts", fn: fetchDrafts, emptyText: "No saved drafts" },
];

const MailPage = () => {
  const [activeTab, setActiveTab] = useState("inbox");
  const [composing, setComposing] = useState(false);
  const tab = TABS.find((t) => t.id === activeTab);

  const handleCompose = () => setComposing(true);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700 bg-surface-900/40 shrink-0">
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${activeTab === id
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
          onClick={handleCompose}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Send size={13} /> Compose
        </button>
      </div>

      {/* Active tab content */}
      <MessageList
        key={tab.id}
        queryKey={tab.queryKey}
        queryFn={tab.fn}
        folder={tab.folder}
        showTo={tab.showTo}
        emptyText={tab.emptyText}
      />

      {composing && <ComposeModal onClose={() => setComposing(false)} />}
    </div>
  );
};

export default MailPage;

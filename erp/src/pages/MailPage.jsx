import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Mail,
  Send,
  RefreshCw,
  Trash2,
  Reply,
  X,
  ChevronLeft,
  Loader2,
  Circle,
} from "lucide-react";
import { fetchInbox, fetchMessage, markRead, deleteMessage, sendMail } from "@/services/mail.service";

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
  }
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
};

const senderLabel = (from) => {
  if (!from) return "Unknown";
  return from.name || from.address || "Unknown";
};

// ─── Compose Modal ─────────────────────────────────────────────────────────

const ComposeModal = ({ onClose, defaultTo = "", defaultSubject = "", defaultBody = "" }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ to: defaultTo, cc: "", subject: defaultSubject, body: defaultBody });

  const mutation = useMutation({
    mutationFn: () =>
      sendMail({ to: form.to, cc: form.cc || undefined, subject: form.subject, text: form.body }),
    onSuccess: () => {
      toast.success("Email sent");
      qc.invalidateQueries({ queryKey: ["mail-inbox"] });
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to send email"),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h2 className="font-semibold text-white">Compose</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
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
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.to || !form.subject || !form.body || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Message Detail ────────────────────────────────────────────────────────

const MessageDetail = ({ uid, onBack, onDelete }) => {
  const qc = useQueryClient();
  const [composing, setComposing] = useState(false);

  const { data: msg, isLoading } = useQuery({
    queryKey: ["mail-message", uid],
    queryFn: () => fetchMessage(uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mail-inbox"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMessage(uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mail-inbox"] });
      toast.success("Message deleted");
      onDelete();
    },
    onError: () => toast.error("Failed to delete"),
  });

  const markUnread = useMutation({
    mutationFn: () => markRead(uid, false),
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

  const replyTo = msg.from?.address ?? "";
  const replySubject = msg.subject?.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`;

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Detail toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-700 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={14} /> Inbox
          </button>
          <div className="flex-1" />
          <button
            onClick={() => markUnread.mutate()}
            className="text-xs text-surface-400 hover:text-white px-2 py-1 rounded transition-colors"
            title="Mark as unread"
          >
            Mark unread
          </button>
          <button
            onClick={() => setComposing(true)}
            className="flex items-center gap-1.5 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Reply size={12} /> Reply
          </button>
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
            <div className="flex gap-2">
              <span className="text-surface-500 w-10 shrink-0">From</span>
              <span className="text-white">
                {msg.from?.name && <span className="mr-1">{msg.from.name}</span>}
                <span className="text-surface-400">&lt;{msg.from?.address}&gt;</span>
              </span>
            </div>
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
              className="w-full min-h-96 border-0 bg-white rounded-lg"
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
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-xs text-surface-300"
                  >
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
          defaultTo={replyTo}
          defaultSubject={replySubject}
          onClose={() => setComposing(false)}
        />
      )}
    </>
  );
};

// ─── Message Row ───────────────────────────────────────────────────────────

const MessageRow = ({ msg, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-surface-800 transition-colors
      ${isSelected ? "bg-primary-600/10 border-l-2 border-l-primary-500" : "hover:bg-surface-800/50"}
    `}
  >
    <div className="mt-1 shrink-0">
      {!msg.seen ? (
        <Circle size={8} className="fill-primary-400 text-primary-400" />
      ) : (
        <div className="w-2 h-2" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm truncate ${msg.seen ? "text-surface-300" : "font-semibold text-white"}`}>
          {senderLabel(msg.from)}
        </span>
        <span className="text-xs text-surface-500 shrink-0">{fmtDate(msg.date)}</span>
      </div>
      <p className={`text-xs mt-0.5 truncate ${msg.seen ? "text-surface-500" : "text-surface-300"}`}>
        {msg.subject}
      </p>
    </div>
  </button>
);

// ─── Main Page ─────────────────────────────────────────────────────────────

const MailPage = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedUid, setSelectedUid] = useState(null);
  const [composing, setComposing] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["mail-inbox", page],
    queryFn: () => fetchInbox({ page, limit: 50 }),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // poll every 2 min
  });

  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;
  const unread = data?.unread ?? 0;
  const totalPages = Math.ceil(total / 50);

  const handleSelect = (uid) => setSelectedUid(uid);
  const handleBack = () => setSelectedUid(null);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700 bg-surface-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-primary-400" />
          <span className="font-semibold text-white text-sm">Inbox</span>
          {unread > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-400 text-xs font-semibold">
              {unread} unread
            </span>
          )}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 text-surface-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Send size={13} /> Compose
        </button>
      </div>

      {/* Main body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Message list — hidden on mobile when detail is open */}
        <div className={`${selectedUid ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-surface-700 overflow-hidden shrink-0`}>
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 size={24} className="animate-spin text-surface-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
              <Mail size={36} className="text-surface-600 mb-3" />
              <p className="text-surface-400 font-medium">Inbox is empty</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                {messages.map((msg) => (
                  <MessageRow
                    key={msg.uid}
                    msg={msg}
                    isSelected={msg.uid === selectedUid}
                    onClick={() => handleSelect(msg.uid)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-surface-700 text-xs text-surface-500">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="disabled:opacity-40 hover:text-white transition-colors"
                  >
                    ← Newer
                  </button>
                  <span>{page} / {totalPages}</span>
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

        {/* Detail panel */}
        {selectedUid ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <MessageDetail
              uid={selectedUid}
              onBack={handleBack}
              onDelete={handleBack}
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

      {composing && <ComposeModal onClose={() => setComposing(false)} />}
    </div>
  );
};

export default MailPage;

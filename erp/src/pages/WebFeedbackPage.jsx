import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Star, Loader2, Archive, CheckCheck, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { fetchFeedback, markFeedbackRead, archiveFeedback } from "@/services/feedback.service";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "archived", label: "Archived" },
];

const STATUS_BADGE = {
  new: "bg-primary-500/20 text-primary-400 border border-primary-500/30",
  read: "bg-surface-700 text-surface-400 border border-surface-600",
  archived: "bg-surface-800 text-surface-500 border border-surface-700",
};

const TYPE_BADGE = {
  complaint: "bg-red-500/15 text-red-400 border border-red-500/30",
  feedback: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
};

const Stars = ({ rating }) => {
  if (!rating) return <span className="text-surface-500 text-[12px]">No rating</span>;
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= rating ? "fill-amber-400 text-amber-400" : "text-surface-600"}
        />
      ))}
    </span>
  );
};

export default function WebFeedbackPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("new");
  const [expanded, setExpanded] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["feedback", statusFilter],
    queryFn: () => fetchFeedback({ status: statusFilter || undefined }),
  });

  const readMutation = useMutation({
    mutationFn: markFeedbackRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Marked as read");
    },
    onError: () => toast.error("Failed to update"),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveFeedback,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Archived");
    },
    onError: () => toast.error("Failed to archive"),
  });

  const items = data?.feedback || [];
  const total = data?.total || 0;
  const newCount = items.filter((i) => i.status === "new").length;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <MessageSquare size={20} className="text-primary-400" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-semibold text-white">Customer Feedback</h1>
            {newCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-600 text-white">
                {newCount}
              </span>
            )}
          </div>
          <p className="text-[12px] text-surface-400">Messages submitted from the public website</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-surface-800/50 border border-surface-700 rounded-lg p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              statusFilter === tab.key
                ? "bg-primary-600 text-white"
                : "text-surface-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-surface-400 text-[13px]">
            No feedback in this category.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`bg-surface-900 border rounded-xl overflow-hidden transition-colors ${
                item.status === "new"
                  ? "border-primary-500/40"
                  : "border-surface-700"
              }`}
            >
              <button
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-800/40 transition-colors"
              >
                <div className="flex items-start gap-4 text-left">
                  <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center shrink-0">
                    <span className="text-[13px] font-semibold text-primary-400">
                      {item.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-white">{item.name}</span>
                      {item.email && (
                        <span className="text-[12px] text-surface-400">{item.email}</span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[item.status]}`}>
                        {item.status}
                      </span>
                      {item.type && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TYPE_BADGE[item.type] || TYPE_BADGE.feedback}`}>
                          {item.type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <Stars rating={item.rating} />
                      <span className="text-[12px] text-surface-500">
                        {new Date(item.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {expanded !== item.id && (
                      <p className="text-[12px] text-surface-400 mt-1 line-clamp-1">
                        {item.message}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-surface-500 transition-transform ${
                    expanded === item.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expanded === item.id && (
                <div className="px-5 pb-4 border-t border-surface-800">
                  <p className="text-[13px] text-surface-200 leading-relaxed mt-3 whitespace-pre-wrap">
                    {item.message}
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    {item.status === "new" && (
                      <button
                        onClick={() => readMutation.mutate(item.id)}
                        disabled={readMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-surface-800 text-surface-300 hover:text-white border border-surface-700 hover:border-surface-600"
                      >
                        <CheckCheck size={13} />
                        Mark as Read
                      </button>
                    )}
                    {item.status !== "archived" && (
                      <button
                        onClick={() => archiveMutation.mutate(item.id)}
                        disabled={archiveMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-surface-800 text-surface-400 hover:text-white border border-surface-700 hover:border-surface-600"
                      >
                        <Archive size={13} />
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {total > items.length && (
        <p className="text-center text-[12px] text-surface-500">
          Showing {items.length} of {total} entries
        </p>
      )}
    </div>
  );
}

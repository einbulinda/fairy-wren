import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Loader2, ChevronDown, Users, Wine, Cake, Phone, Mail, StickyNote } from "lucide-react";
import toast from "react-hot-toast";
import { fetchReservations, updateReservationStatus } from "@/services/reservations.service";

const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "", label: "All" },
];

const STATUS_STYLES = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  completed: "bg-primary-500/15 text-primary-400 border border-primary-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const STATUS_ACTIONS = {
  pending: [
    { label: "Confirm", next: "confirmed", cls: "bg-emerald-600 hover:bg-emerald-500 text-white" },
    { label: "Cancel", next: "cancelled", cls: "bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30" },
  ],
  confirmed: [
    { label: "Mark Completed", next: "completed", cls: "bg-primary-600 hover:bg-primary-500 text-white" },
    { label: "Cancel", next: "cancelled", cls: "bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30" },
  ],
  completed: [],
  cancelled: [
    { label: "Restore to Pending", next: "pending", cls: "bg-surface-700 hover:bg-surface-600 text-white border border-surface-600" },
  ],
};

const formatDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

const formatTime = (t) => (t ? t.slice(0, 5) : null);

export default function WebReservationsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [expanded, setExpanded] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reservations", statusFilter],
    queryFn: () => fetchReservations({ status: statusFilter || undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateReservationStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      toast.success(`Reservation ${status}`);
    },
    onError: () => toast.error("Failed to update reservation"),
  });

  const items = data?.reservations || [];
  const total = data?.total || 0;
  const pendingCount = statusFilter === "pending" ? total : undefined;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <CalendarCheck size={20} className="text-primary-400" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-semibold text-white">Reservations</h1>
            {statusFilter === "pending" && total > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
                {total}
              </span>
            )}
          </div>
          <p className="text-[12px] text-surface-400">Table reservations from the public website</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 bg-surface-800/50 border border-surface-700 rounded-lg p-1 w-fit">
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
            No reservations in this category.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`bg-surface-900 border rounded-xl overflow-hidden transition-colors ${
                item.status === "pending" ? "border-amber-500/40" : "border-surface-700"
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
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[item.status] || ""}`}>
                        {item.status}
                      </span>
                      {item.special_occasion && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          <Cake size={10} />
                          {item.special_occasion}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[12px] text-surface-400 flex-wrap">
                      <span>{formatDate(item.reservation_date)}{formatTime(item.reservation_time) ? ` at ${formatTime(item.reservation_time)}` : ""}</span>
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {item.party_size} {item.party_size === 1 ? "person" : "people"}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-surface-500 transition-transform ${expanded === item.id ? "rotate-180" : ""}`}
                />
              </button>

              {expanded === item.id && (
                <div className="px-5 pb-5 border-t border-surface-800 pt-4 space-y-4">
                  {/* Contact */}
                  <div className="grid grid-cols-2 gap-3">
                    {item.phone && (
                      <div className="flex items-center gap-2 text-[12px] text-surface-300">
                        <Phone size={13} className="text-surface-500 shrink-0" />
                        <a href={`tel:${item.phone}`} className="hover:text-white transition-colors">{item.phone}</a>
                      </div>
                    )}
                    {item.email && (
                      <div className="flex items-center gap-2 text-[12px] text-surface-300">
                        <Mail size={13} className="text-surface-500 shrink-0" />
                        <a href={`mailto:${item.email}`} className="hover:text-white transition-colors">{item.email}</a>
                      </div>
                    )}
                  </div>

                  {/* Drink of choice */}
                  {item.drink_of_choice && (
                    <div className="flex items-start gap-2 text-[12px]">
                      <Wine size={13} className="text-surface-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-surface-500">Drink preference: </span>
                        <span className="text-surface-200">{item.drink_of_choice}</span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div className="flex items-start gap-2 text-[12px]">
                      <StickyNote size={13} className="text-surface-500 mt-0.5 shrink-0" />
                      <p className="text-surface-300 leading-relaxed whitespace-pre-wrap">{item.notes}</p>
                    </div>
                  )}

                  {/* Submitted at */}
                  <p className="text-[11px] text-surface-600">
                    Submitted {new Date(item.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })}
                  </p>

                  {/* Actions */}
                  {(STATUS_ACTIONS[item.status] || []).length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      {STATUS_ACTIONS[item.status].map((action) => (
                        <button
                          key={action.next}
                          onClick={() => statusMutation.mutate({ id: item.id, status: action.next })}
                          disabled={statusMutation.isPending}
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 ${action.cls}`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
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

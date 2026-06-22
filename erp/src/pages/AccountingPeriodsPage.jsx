import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPeriods,
  generatePeriods,
  closePeriod,
  reopenPeriod,
} from "@/services/periods.service";
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const StatusBadge = ({ status }) => {
  if (status === "closed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-700 text-surface-300">
        <Lock size={9} /> Closed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400">
      <CheckCircle2 size={9} /> Open
    </span>
  );
};

const ConfirmModal = ({ title, children, confirmLabel, confirmClass, onConfirm, onClose, loading }) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-sm shadow-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        <button onClick={onClose} className="p-1 rounded text-surface-400 hover:text-white">
          <X size={18} />
        </button>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
      <div className="flex gap-2 px-5 pb-5">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm text-surface-300 bg-surface-700 hover:bg-surface-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${confirmClass}`}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

const AccountingPeriodsPage = () => {
  const { user } = useAuth();
  const canManage = user?.permissions?.includes("manage_periods");
  const canClose = user?.permissions?.includes("close_periods");
  const canReopen = user?.permissions?.includes("reopen_periods");

  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [yearInput, setYearInput] = useState(String(currentYear));
  const [closeModal, setCloseModal] = useState(null); // { year, month }
  const [reopenModal, setReopenModal] = useState(null);
  const [closeNotes, setCloseNotes] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [generateYear, setGenerateYear] = useState(String(currentYear));

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["accounting-periods", selectedYear],
    queryFn: () => fetchPeriods({ year: selectedYear }),
    staleTime: 30 * 1000,
  });

  const yearOptions = useMemo(() => {
    const years = new Set(periods.map((p) => p.year));
    years.add(currentYear);
    years.add(currentYear - 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [periods]);

  const periodMap = useMemo(() => {
    const map = {};
    periods.forEach((p) => { map[p.month] = p; });
    return map;
  }, [periods]);

  const generateMutation = useMutation({
    mutationFn: (year) => generatePeriods(year),
    onSuccess: () => {
      toast.success("Periods generated");
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
    },
    onError: (e) => toast.error(e.message || "Failed to generate periods"),
  });

  const closeMutation = useMutation({
    mutationFn: ({ year, month, notes }) => closePeriod(year, month, notes),
    onSuccess: () => {
      toast.success("Period closed");
      setCloseModal(null);
      setCloseNotes("");
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
    },
    onError: (e) => toast.error(e.message || "Failed to close period"),
  });

  const reopenMutation = useMutation({
    mutationFn: ({ year, month, reason }) => reopenPeriod(year, month, reason),
    onSuccess: () => {
      toast.success("Period reopened");
      setReopenModal(null);
      setReopenReason("");
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
    },
    onError: (e) => toast.error(e.message || "Failed to reopen period"),
  });

  const hasCurrentYear = periods.length > 0;

  return (
    <div className="space-y-5">
      {/* Header + Generate */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Accounting Periods</h2>
          <p className="text-[12px] text-surface-400 mt-0.5">
            Control which months are open for journal posting
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={generateYear}
              onChange={(e) => setGenerateYear(e.target.value)}
              min="2020"
              max="2099"
              className="w-24 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            />
            <button
              onClick={() => generateMutation.mutate(parseInt(generateYear))}
              disabled={generateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white disabled:opacity-60 transition-colors"
            >
              {generateMutation.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <Plus size={14} />}
              Generate Year
            </button>
          </div>
        )}
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] text-surface-400 font-medium">Year:</span>
        {yearOptions.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
              selectedYear === y
                ? "bg-primary-600/30 text-primary-300 border border-primary-500/40"
                : "bg-surface-800 text-surface-400 border border-surface-700 hover:text-white"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Warning if current period closed */}
      {(() => {
        const curr = periodMap[currentMonth];
        if (selectedYear === currentYear && curr?.status === "closed") {
          return (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[13px] text-amber-300">
                The current period ({MONTHS[currentMonth - 1]} {currentYear}) is closed. New journal entries cannot be posted.
              </p>
            </div>
          );
        }
        return null;
      })()}

      {/* Periods list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-surface-500">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading periods…
        </div>
      ) : !hasCurrentYear ? (
        <div className="text-center py-16">
          <Calendar size={32} className="mx-auto mb-3 text-surface-600" />
          <p className="text-[13px] text-surface-400">
            No periods found for {selectedYear}.
          </p>
          {canManage && (
            <p className="text-[12px] text-surface-500 mt-1">
              Use &ldquo;Generate Year&rdquo; above to create them.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-surface-900 rounded-xl border border-surface-700 overflow-hidden">
          {/* Desktop table */}
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Month</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Closed At</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Notes</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((name, idx) => {
                const monthNum = idx + 1;
                const period = periodMap[monthNum];
                const isCurrent = selectedYear === currentYear && monthNum === currentMonth;
                const isFuture = selectedYear === currentYear && monthNum > currentMonth;

                return (
                  <tr
                    key={monthNum}
                    className={`border-b border-surface-700/50 last:border-0 ${
                      isCurrent ? "bg-primary-600/5" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5 text-white font-medium">
                      {name}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] bg-primary-600/20 text-primary-400 px-1.5 py-0.5 rounded-full font-semibold">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {period ? (
                        <StatusBadge status={period.status} />
                      ) : (
                        <span className="text-[12px] text-surface-600 italic">Not generated</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-surface-400">
                      {period?.closed_at
                        ? new Date(period.closed_at).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-surface-400 max-w-xs truncate">
                      {period?.notes || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {period && !isFuture && (
                        period.status === "open" ? (
                          canClose && (
                            <button
                              onClick={() => setCloseModal({ year: selectedYear, month: monthNum, name })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-surface-700 hover:bg-surface-600 text-surface-200 transition-colors"
                            >
                              <Lock size={12} /> Close
                            </button>
                          )
                        ) : (
                          canReopen && (
                            <button
                              onClick={() => setReopenModal({ year: selectedYear, month: monthNum, name })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 transition-colors"
                            >
                              <Unlock size={12} /> Reopen
                            </button>
                          )
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-surface-700/50">
            {MONTHS.map((name, idx) => {
              const monthNum = idx + 1;
              const period = periodMap[monthNum];
              const isCurrent = selectedYear === currentYear && monthNum === currentMonth;
              const isFuture = selectedYear === currentYear && monthNum > currentMonth;

              return (
                <div key={monthNum} className={`px-4 py-3.5 ${isCurrent ? "bg-primary-600/5" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-white">{name} {selectedYear}</span>
                      {isCurrent && (
                        <span className="text-[10px] bg-primary-600/20 text-primary-400 px-1.5 py-0.5 rounded-full font-semibold">
                          Current
                        </span>
                      )}
                    </div>
                    {period ? <StatusBadge status={period.status} /> : (
                      <span className="text-[11px] text-surface-600 italic">Not generated</span>
                    )}
                  </div>
                  {period?.closed_at && (
                    <p className="text-[11px] text-surface-500">
                      Closed {new Date(period.closed_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  )}
                  {period && !isFuture && (
                    <div className="mt-2">
                      {period.status === "open" ? (
                        canClose && (
                          <button
                            onClick={() => setCloseModal({ year: selectedYear, month: monthNum, name })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-surface-700 text-surface-200"
                          >
                            <Lock size={12} /> Close Period
                          </button>
                        )
                      ) : (
                        canReopen && (
                          <button
                            onClick={() => setReopenModal({ year: selectedYear, month: monthNum, name })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-amber-500/15 text-amber-400"
                          >
                            <Unlock size={12} /> Reopen Period
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Close modal */}
      {closeModal && (
        <ConfirmModal
          title={`Close ${closeModal.name} ${closeModal.year}`}
          confirmLabel="Close Period"
          confirmClass="bg-surface-700 hover:bg-surface-600"
          loading={closeMutation.isPending}
          onClose={() => { setCloseModal(null); setCloseNotes(""); }}
          onConfirm={() => closeMutation.mutate({ year: closeModal.year, month: closeModal.month, notes: closeNotes })}
        >
          <p className="text-[13px] text-surface-300">
            Closing this period will prevent new journal entries from being posted to it.
            Existing entries are not affected.
          </p>
          <div>
            <label className="text-[12px] text-surface-400 block mb-1">Notes (optional)</label>
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Month-end closing complete"
              className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500 resize-none"
            />
          </div>
        </ConfirmModal>
      )}

      {/* Reopen modal */}
      {reopenModal && (
        <ConfirmModal
          title={`Reopen ${reopenModal.name} ${reopenModal.year}`}
          confirmLabel="Reopen Period"
          confirmClass="bg-amber-600 hover:bg-amber-500"
          loading={reopenMutation.isPending}
          onClose={() => { setReopenModal(null); setReopenReason(""); }}
          onConfirm={() => {
            if (reopenReason.trim().length < 10) {
              toast.error("Reason must be at least 10 characters");
              return;
            }
            reopenMutation.mutate({ year: reopenModal.year, month: reopenModal.month, reason: reopenReason });
          }}
        >
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[12px] text-amber-300">
              Reopening a closed period allows new journal entries to be posted. This should only be done with proper authorisation.
            </p>
          </div>
          <div>
            <label className="text-[12px] text-surface-400 block mb-1">
              Reason <span className="text-danger">*</span>
              <span className="text-surface-500 ml-1">(min. 10 characters)</span>
            </label>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              rows={3}
              placeholder="State the reason for reopening this period…"
              className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500 resize-none"
            />
            <p className="text-[11px] text-surface-500 mt-1">{reopenReason.length} / 10 min</p>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default AccountingPeriodsPage;

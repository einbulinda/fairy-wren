import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts } from "@/services/accounts.service";
import {
  useStatement,
  useReconciliationReport,
  useAutoMatch,
  useManualMatch,
  useUnmatchLine,
  useFinalizeReconciliation,
  useBankGlDetails,
} from "@/hooks/useBankReconciliation";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Link2,
  Unlink,
  Zap,
  Lock,
  Landmark,
} from "lucide-react";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";
import { fmt } from "@/utils/formatters";

const STATUS_STYLES = {
  draft: { label: "Draft", icon: Clock, cls: "bg-surface-700 text-surface-300" },
  reconciled: { label: "Reconciled", icon: CheckCircle, cls: "bg-emerald-500/15 text-emerald-400" },
  cancelled: { label: "Cancelled", icon: XCircle, cls: "bg-red-500/15 text-red-400" },
};

const MATCH_STYLES = {
  unmatched: { label: "Unmatched", cls: "bg-amber-500/15 text-amber-400" },
  matched: { label: "Matched", cls: "bg-emerald-500/15 text-emerald-400" },
  adjusted: { label: "Adjusted", cls: "bg-primary-500/15 text-primary-400" },
};

const BankReconciliationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedLineId, setSelectedLineId] = useState(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts({ active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: statementData, isLoading: isStatementLoading } = useStatement(id);
  const { data: reportData, isLoading: isReportLoading } = useReconciliationReport(id);
  const autoMatchMutation = useAutoMatch();
  const manualMatchMutation = useManualMatch();
  const unmatchMutation = useUnmatchLine();
  const finalizeMutation = useFinalizeReconciliation();

  const statement = statementData?.statement;
  const lines = statementData?.lines || [];
  const summary = reportData?.summary;

  const bankAccountId = statement?.bank_account_id;
  const { data: glEntries = [], isLoading: isGlLoading } = useBankGlDetails(bankAccountId, {
    startDate: statement?.start_date,
    endDate: statement?.end_date,
  });

  const bankAccountName = useMemo(() => {
    const acc = accounts.find((a) => a.id === bankAccountId);
    return acc?.name || "—";
  }, [accounts, bankAccountId]);

  const unmatchedLines = lines.filter((l) => l.match_status === "unmatched");
  const canFinalize = statement?.status === "draft" && unmatchedLines.length === 0 && lines.length > 0;

  const handleAutoMatch = () => {
    if (!confirm("Run auto-match for this statement?")) return;
    autoMatchMutation.mutate({ id, opts: {} });
  };

  const handleManualMatch = (lineId, journalEntryId) => {
    manualMatchMutation.mutate({ id, lineId, payload: { journalEntryId } });
    setSelectedLineId(null);
  };

  const handleUnmatch = (lineId) => {
    if (!confirm("Unmatch this line?")) return;
    unmatchMutation.mutate({ id, lineId });
  };

  const handleFinalize = () => {
    if (!confirm("Finalize this reconciliation? No further changes will be allowed.")) return;
    finalizeMutation.mutate({ id, payload: { adjustments: [] } });
  };

  const isLoading = isStatementLoading || isReportLoading;

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="py-16 text-center text-surface-500">
        <p>Statement not found</p>
        <button onClick={() => navigate("/accounting")} className="mt-4 text-primary-400 hover:underline">
          Back to statements
        </button>
      </div>
    );
  }

  const status = STATUS_STYLES[statement.status] || STATUS_STYLES.draft;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/accounting")} className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <Landmark size={18} className="text-primary-400" />
              {statement.description || "Bank Statement"}
            </h1>
            <p className="text-sm text-surface-400">
              {bankAccountName} • {new Date(statement.start_date).toLocaleDateString("en-KE")} – {new Date(statement.end_date).toLocaleDateString("en-KE")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statement.status === "draft" && (
            <>
              <button onClick={handleAutoMatch} disabled={autoMatchMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
                <Zap size={15} /> {autoMatchMutation.isPending ? "Matching…" : "Auto-Match"}
              </button>
              <button onClick={handleFinalize} disabled={!canFinalize || finalizeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
                <Lock size={15} /> {finalizeMutation.isPending ? "Finalizing…" : "Finalize"}
              </button>
            </>
          )}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${status.cls}`}>
            <StatusIcon size={12} /> {status.label}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Opening Balance</p>
          <p className="text-xl font-bold text-white">{fmt(statement.opening_balance)}</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Closing Balance</p>
          <p className="text-xl font-bold text-white">{fmt(statement.closing_balance)}</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Matched / Total</p>
          <p className="text-xl font-bold text-emerald-400">
            {summary?.matched_count || 0} <span className="text-surface-500 text-sm">/ {lines.length}</span>
          </p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Difference</p>
          <p className={`text-xl font-bold ${summary?.difference === 0 ? "text-emerald-400" : "text-amber-400"}`}>
            {fmt(summary?.difference || 0)}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statement lines */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-surface-700">
            <h2 className="font-semibold text-white">Statement Lines</h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Deposits: {fmt(summary?.total_deposits || 0)} • Withdrawals: {fmt(summary?.total_withdrawals || 0)}
            </p>
          </div>

          {lines.length === 0 ? (
            <div className="py-12 text-center text-surface-500">
              <p>No lines in this statement</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-900/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Deposit</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Withdrawal</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/50">
                    {lines.map((line) => {
                      const ms = MATCH_STYLES[line.match_status] || MATCH_STYLES.unmatched;
                      const isSelected = selectedLineId === line.id;
                      return (
                        <tr key={line.id}
                          className={`transition-colors ${isSelected ? "bg-primary-600/10" : "hover:bg-surface-700/30"} ${line.match_status === "unmatched" && statement.status === "draft" ? "cursor-pointer" : ""}`}
                          onClick={() => {
                            if (statement.status === "draft" && line.match_status === "unmatched") {
                              setSelectedLineId(line.id);
                            }
                          }}
                        >
                          <td className="px-4 py-3 text-white whitespace-nowrap">{new Date(line.transaction_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}</td>
                          <td className="px-4 py-3">
                            <p className="text-white">{line.description || "—"}</p>
                            {line.reference && <p className="text-[11px] text-surface-500">Ref: {line.reference}</p>}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-400">{line.deposit ? fmt(line.deposit) : "—"}</td>
                          <td className="px-4 py-3 text-right text-red-400">{line.withdrawal ? fmt(line.withdrawal) : "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${ms.cls}`}>
                              {ms.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {statement.status === "draft" && line.match_status === "matched" && (
                              <button onClick={(e) => { e.stopPropagation(); handleUnmatch(line.id); }}
                                className="text-surface-400 hover:text-white flex items-center gap-1 text-xs ml-auto">
                                <Unlink size={12} /> Unmatch
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <MobileCardList>
                {lines.map((line) => {
                  const ms = MATCH_STYLES[line.match_status] || MATCH_STYLES.unmatched;
                  const isSelected = selectedLineId === line.id;
                  return (
                    <MobileCard key={line.id}
                      className={isSelected ? "border-primary-500/50" : ""}
                      onClick={() => {
                        if (statement.status === "draft" && line.match_status === "unmatched") {
                          setSelectedLineId(line.id);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm">{new Date(line.transaction_date).toLocaleDateString("en-KE")}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${ms.cls}`}>
                          {ms.label}
                        </span>
                      </div>
                      <p className="text-white font-medium text-sm">{line.description || "—"}</p>
                      {line.reference && <p className="text-[11px] text-surface-500">Ref: {line.reference}</p>}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-400">{line.deposit ? fmt(line.deposit) : "—"}</span>
                        <span className="text-red-400">{line.withdrawal ? fmt(line.withdrawal) : "—"}</span>
                      </div>
                      {statement.status === "draft" && line.match_status === "matched" && (
                        <button onClick={(e) => { e.stopPropagation(); handleUnmatch(line.id); }}
                          className="text-surface-400 hover:text-white flex items-center gap-1 text-xs">
                          <Unlink size={12} /> Unmatch
                        </button>
                      )}
                    </MobileCard>
                  );
                })}
              </MobileCardList>
            </>
          )}
        </div>

        {/* Unreconciled GL entries */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-surface-700 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Unreconciled GL Entries</h2>
              <p className="text-xs text-surface-400 mt-0.5">
                {isGlLoading ? "Loading…" : `${glEntries.length} entries available for matching`}
              </p>
            </div>
            {selectedLineId && (
              <button onClick={() => setSelectedLineId(null)} className="text-xs text-surface-400 hover:text-white">
                Cancel selection
              </button>
            )}
          </div>

          {isGlLoading ? (
            <div className="py-12 text-center text-surface-500">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p>Loading entries…</p>
            </div>
          ) : glEntries.length === 0 ? (
            <div className="py-12 text-center text-surface-500">
              <p>No unreconciled entries</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-900/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Reference</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/50">
                    {glEntries.map((entry) => (
                      <tr key={`${entry.journal_entry_id}-${entry.journal_line_id}`} className="hover:bg-surface-700/30 transition-colors">
                        <td className="px-4 py-3 text-white whitespace-nowrap">{new Date(entry.entry_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}</td>
                        <td className="px-4 py-3">
                          <p className="text-white">{entry.reference || entry.entry_description || "—"}</p>
                          <p className="text-[11px] text-surface-500">{entry.source_type || "journal_entry"}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {entry.net_amount > 0 ? fmt(entry.net_amount) : fmt(Math.abs(entry.net_amount))}
                          <span className={`text-[10px] ml-1 ${entry.net_amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {entry.net_amount > 0 ? "DR" : "CR"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {selectedLineId && statement.status === "draft" ? (
                            <button onClick={() => handleManualMatch(selectedLineId, entry.journal_entry_id)}
                              disabled={manualMatchMutation.isPending}
                              className="px-2.5 py-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-xs rounded-lg flex items-center gap-1 ml-auto transition-colors">
                              <Link2 size={11} /> Match
                            </button>
                          ) : (
                            <span className="text-xs text-surface-500">Select a line to match</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <MobileCardList>
                {glEntries.map((entry) => (
                  <MobileCard key={`${entry.journal_entry_id}-${entry.journal_line_id}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">{new Date(entry.entry_date).toLocaleDateString("en-KE")}</span>
                      <span className="text-[11px] text-surface-500">{entry.source_type || "journal_entry"}</span>
                    </div>
                    <p className="text-white font-medium text-sm">{entry.reference || entry.entry_description || "—"}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">
                        {entry.net_amount > 0 ? fmt(entry.net_amount) : fmt(Math.abs(entry.net_amount))}
                        <span className={`text-[10px] ml-1 ${entry.net_amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {entry.net_amount > 0 ? "DR" : "CR"}
                        </span>
                      </span>
                      {selectedLineId && statement.status === "draft" && (
                        <button onClick={() => handleManualMatch(selectedLineId, entry.journal_entry_id)}
                          disabled={manualMatchMutation.isPending}
                          className="px-2.5 py-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-xs rounded-lg flex items-center gap-1 transition-colors">
                          <Link2 size={11} /> Match
                        </button>
                      )}
                    </div>
                  </MobileCard>
                ))}
              </MobileCardList>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankReconciliationDetailPage;

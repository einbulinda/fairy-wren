import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Receipt, Landmark, Calendar, FileText } from "lucide-react";
import { useCheque } from "@/hooks/useCheques";
import { fetchJournal } from "@/services/journals.service";
import { fmt, fmtDate, fmtDateTime } from "@/utils/formatters";
import { CHEQUE_STATUS_STYLES } from "@/utils/constants";

const ChequeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: cheque, isLoading, isError } = useCheque(id);
  const { data: journal, isLoading: journalLoading } = useQuery({
    queryKey: ["journal", cheque?.journal_entry_id],
    queryFn: () => fetchJournal(cheque.journal_entry_id),
    enabled: !!cheque?.journal_entry_id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-surface-400">
        Loading…
      </div>
    );
  }

  if (isError || !cheque) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <p className="text-red-400 text-sm">Failed to load payment.</p>
      </div>
    );
  }

  const s = CHEQUE_STATUS_STYLES[cheque.status] || CHEQUE_STATUS_STYLES.issued;
  const Icon = s.icon;
  const typeLabel = cheque.transaction_type === "transfer"
    ? "Transfer"
    : cheque.payee_type === "expense"
      ? "Expense Payment"
      : cheque.payee_type === "supplier"
        ? "Supplier Payment"
        : "Payment";

  const lines = journal?.journal_lines || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header card */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary-500/10">
                <Receipt size={18} className="text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white font-mono">{cheque.cheque_number}</h2>
                <p className="text-sm text-surface-400">{typeLabel}</p>
              </div>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full font-medium ${s.cls}`}>
            <Icon size={14} /> {s.label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-surface-700">
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider flex items-center gap-1"><FileText size={12} /> Payee</p>
            <p className="text-white font-medium">{cheque.payee_name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider flex items-center gap-1"><Landmark size={12} /> Bank Account</p>
            <p className="text-white font-medium">{cheque.bank_account?.name || "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider flex items-center gap-1"><Calendar size={12} /> Date</p>
            <p className="text-white font-medium">{fmtDate(cheque.cheque_date)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider">Amount</p>
            <p className="text-white font-bold text-lg tabular-nums">{fmt(cheque.amount)}</p>
          </div>
          {cheque.memo && (
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Memo</p>
              <p className="text-white">{cheque.memo}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-surface-700 text-xs text-surface-500">
          <div>Issued <span className="text-surface-300">{fmtDateTime(cheque.created_at)}</span></div>
          {cheque.cleared_at && <div>Cleared <span className="text-surface-300">{fmtDateTime(cheque.cleared_at)}</span></div>}
          {cheque.voided_at && <div>Voided <span className="text-surface-300">{fmtDateTime(cheque.voided_at)}</span></div>}
        </div>
      </div>

      {/* What this entailed — journal breakdown */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-700">
          <h3 className="font-semibold text-white">What This Entailed</h3>
          <p className="text-xs text-surface-500 mt-0.5">Accounting entry posted for this payment</p>
        </div>

        {journalLoading ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : lines.length === 0 ? (
          <div className="py-10 text-center text-surface-500 text-sm">No journal entry found for this payment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50 border-b border-surface-700">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Account</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Memo</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Debit</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-3 text-white">
                      {l.chart_of_accounts?.name || "—"}
                      {l.chart_of_accounts?.code && <span className="text-surface-500 ml-1.5 font-mono text-xs">{l.chart_of_accounts.code}</span>}
                    </td>
                    <td className="px-5 py-3 text-surface-400">{l.description || "—"}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-emerald-400">{Number(l.debit) > 0 ? fmt(l.debit) : "—"}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-red-400">{Number(l.credit) > 0 ? fmt(l.credit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChequeDetailPage;

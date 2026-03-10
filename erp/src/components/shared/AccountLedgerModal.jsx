import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccountLedger } from "@/services/accounts.service";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { fmt, fmtDate } from "@/utils/formatters";

const PAGE_SIZE = 15;

const AccountLedgerModal = ({ accountId, accountName, from, to, onClose }) => {
  const [page, setPage] = useState(1);

  const { data: ledger = [], isLoading } = useQuery({
    queryKey: ["ledger-drilldown", accountId, from, to],
    queryFn: () => fetchAccountLedger(accountId, from, to),
    enabled: !!accountId,
    staleTime: 0,
  });

  const totalPages = Math.max(1, Math.ceil(ledger.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = ledger.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalDebit = ledger.reduce((s, r) => s + Number(r.debit ?? 0), 0);
  const totalCredit = ledger.reduce((s, r) => s + Number(r.credit ?? 0), 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-800 rounded-xl border border-surface-700 w-full max-w-3xl mx-4 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-700 shrink-0">
          <div>
            <h3 className="text-white font-semibold text-sm">{accountName}</h3>
            <p className="text-xs text-surface-400 mt-0.5">
              {from && to ? `${fmtDate(from)} — ${fmtDate(to)}` : "All entries"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1">
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ledger.length === 0 ? (
            <div className="py-12 text-center text-surface-500 text-sm">
              No entries found for this account in the selected period.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50 border-b border-surface-700 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-surface-400">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-surface-400">Reference</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-surface-400 hidden sm:table-cell">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-surface-400">Debit</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-surface-400">Credit</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-surface-400">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/30">
                {pageItems.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-700/20 transition-colors">
                    <td className="px-4 py-2 text-surface-300 whitespace-nowrap">{fmtDate(row.entry_date)}</td>
                    <td className="px-4 py-2 text-surface-400 font-mono text-xs">{row.reference || "—"}</td>
                    <td className="px-4 py-2 text-surface-400 hidden sm:table-cell truncate max-w-48">{row.description || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-surface-300">
                      {Number(row.debit) > 0 ? fmt(row.debit) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-surface-300">
                      {Number(row.credit) > 0 ? fmt(row.credit) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-white font-medium">
                      {fmt(Math.abs(row.running_balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-surface-600 bg-surface-900/30">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-surface-400 text-right hidden sm:table-cell">
                    Totals
                  </td>
                  <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-surface-400 text-right sm:hidden">
                    Totals
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-white hidden sm:table-cell">
                    {fmt(totalDebit)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-white hidden sm:table-cell">
                    {fmt(totalCredit)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-white hidden sm:table-cell">
                    {ledger.length > 0 ? fmt(Math.abs(ledger[ledger.length - 1].running_balance)) : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-surface-700 shrink-0">
            <span className="text-xs text-surface-400">{ledger.length} entries</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 text-xs text-surface-400">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountLedgerModal;

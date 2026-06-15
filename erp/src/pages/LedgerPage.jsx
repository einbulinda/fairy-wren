import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts, fetchAccountLedger } from "@/services/accounts.service";
import { fetchJournals } from "@/services/journals.service";
import { BookOpen, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";
import { fmt, fmtDate, localDateStr } from "@/utils/formatters";
import { dateInputCls } from "@/utils/constants";

const todayStr = localDateStr();
const firstOfMonth = `${todayStr.slice(0, 7)}-01`;

const PAGE_SIZE = 15;

const LedgerPage = () => {
  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayStr);
  const [page, setPage] = useState(1);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts({ active: true }),
    staleTime: 5 * 60 * 1000,
  });

  // Per-account ledger (when account selected)
  const { data: ledger = [], isLoading: ledgerLoading, isFetching: ledgerFetching } = useQuery({
    queryKey: ["ledger", accountId, from, to],
    queryFn: () => fetchAccountLedger(accountId, from, to),
    enabled: !!accountId && !!from && !!to,
    staleTime: 0,
  });

  // All journal entries (when no account selected)
  const { data: journals = [], isLoading: journalsLoading, isFetching: journalsFetching } = useQuery({
    queryKey: ["journals", { from, to }],
    queryFn: () => fetchJournals({ from, to }),
    enabled: !accountId && !!from && !!to,
    staleTime: 0,
  });

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isLoading = accountId ? ledgerLoading : journalsLoading;
  const isFetching = accountId ? ledgerFetching : journalsFetching;

  // Flatten journals into ledger-style rows for the "all entries" view
  const allEntriesRows = useMemo(() => {
    if (accountId) return [];
    return journals.flatMap((entry) =>
      (entry.journal_lines || []).map((line) => ({
        entry_date: entry.entry_date,
        reference: entry.reference || "",
        description: entry.description || "",
        source_type: entry.source_type,
        account_code: line.chart_of_accounts?.code || "",
        account_name: line.chart_of_accounts?.name || "",
        debit: Number(line.debit ?? 0),
        credit: Number(line.credit ?? 0),
        journal_id: entry.id,
        reversed: !!entry.reversed_entry_id,
      })),
    );
  }, [journals, accountId]);

  // Stats
  const totalDebits = accountId
    ? ledger.reduce((s, r) => s + Number(r.debit ?? 0), 0)
    : allEntriesRows.reduce((s, r) => s + r.debit, 0);
  const totalCredits = accountId
    ? ledger.reduce((s, r) => s + Number(r.credit ?? 0), 0)
    : allEntriesRows.reduce((s, r) => s + r.credit, 0);
  const closingBalance = accountId && ledger.length ? Number(ledger[ledger.length - 1].running_balance) : null;

  const data = accountId ? ledger : allEntriesRows;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = data.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const inputCls = dateInputCls;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">Account</label>
            <select className={`w-full ${inputCls}`} value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1); }}>
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">From</label>
            <input type="date" className={`w-full ${inputCls}`} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">To</label>
            <input type="date" className={`w-full ${inputCls}`} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className={`grid ${closingBalance !== null ? "grid-cols-3" : "grid-cols-2"} gap-4`}>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-emerald-400" />
            <span className="text-xs text-surface-400 uppercase tracking-wider">Total Debits</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{fmt(totalDebits)}</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={15} className="text-red-400" />
            <span className="text-xs text-surface-400 uppercase tracking-wider">Total Credits</span>
          </div>
          <p className="text-xl font-bold text-red-400">{fmt(totalCredits)}</p>
        </div>
        {closingBalance !== null && (
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Minus size={15} className="text-primary-400" />
              <span className="text-xs text-surface-400 uppercase tracking-wider">Closing Balance</span>
            </div>
            <p className={`text-xl font-bold ${closingBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(closingBalance)}</p>
          </div>
        )}
      </div>

      {/* Ledger table */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary-400" />
            <h2 className="font-semibold text-white">
              {selectedAccount ? selectedAccount.name : "General Ledger"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {data.length > 0 && (
              <span className="text-xs text-surface-400">{data.length} {accountId ? "entries" : "lines"}</span>
            )}
            {isFetching && <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <BookOpen size={40} className="mx-auto mb-3 text-surface-700" />
            <p>No transactions in this period</p>
          </div>
        ) : accountId ? (
          /* ─── Per-account ledger view ─── */
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50 border-b border-surface-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Credit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {pageItems.map((row, i) => {
                  const balance = Number(row.running_balance);
                  return (
                    <tr key={i} className="hover:bg-surface-700/30 transition-colors">
                      <td className="px-4 py-3 text-surface-300 whitespace-nowrap">{fmtDate(row.entry_date)}</td>
                      <td className="px-4 py-3 font-mono text-surface-300 text-xs">{row.reference || "—"}</td>
                      <td className="px-4 py-3 text-surface-300">{row.description || "—"}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {Number(row.debit) > 0 ? fmt(row.debit) : ""}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {Number(row.credit) > 0 ? fmt(row.credit) : ""}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${balance >= 0 ? "text-white" : "text-red-400"}`}>
                        {fmt(balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <MobileCardList>
            {pageItems.map((row, i) => {
              const balance = Number(row.running_balance);
              return (
                <MobileCard key={i}>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{fmtDate(row.entry_date)}</span>
                    <span className={`text-sm font-medium tabular-nums ${balance >= 0 ? "text-white" : "text-red-400"}`}>
                      {fmt(balance)}
                    </span>
                  </div>
                  {row.reference && <div className="font-mono text-xs text-surface-400">{row.reference}</div>}
                  {row.description && <div className="text-xs text-surface-400">{row.description}</div>}
                  <div className="flex items-center justify-between text-xs">
                    {Number(row.debit) > 0 && <span className="text-emerald-400">Dr {fmt(row.debit)}</span>}
                    {Number(row.credit) > 0 && <span className="text-red-400 ml-auto">Cr {fmt(row.credit)}</span>}
                  </div>
                </MobileCard>
              );
            })}
          </MobileCardList>
          </>
        ) : (
          /* ─── All-accounts journal entries view ─── */
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50 border-b border-surface-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden lg:table-cell">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {pageItems.map((row, i) => (
                  <tr key={i} className={`hover:bg-surface-700/30 transition-colors ${row.reversed ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-surface-300 whitespace-nowrap">{fmtDate(row.entry_date)}</td>
                    <td className="px-4 py-3 font-mono text-surface-300 text-xs">{row.reference || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="text-white text-sm">{row.account_name}</div>
                    </td>
                    <td className="px-4 py-3 text-surface-400 text-xs hidden lg:table-cell">{row.description || "—"}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">
                      {row.debit > 0 ? fmt(row.debit) : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400 tabular-nums">
                      {row.credit > 0 ? fmt(row.credit) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <MobileCardList>
            {pageItems.map((row, i) => (
              <MobileCard key={i} className={row.reversed ? "opacity-50" : ""}>
                <div className="flex items-center justify-between">
                  <span className="text-surface-300 text-sm">{fmtDate(row.entry_date)}</span>
                  {row.reference && <span className="font-mono text-xs text-surface-400">{row.reference}</span>}
                </div>
                <div className="text-white text-sm font-medium">
                  {row.account_name}
                </div>
                {row.description && <div className="text-xs text-surface-400">{row.description}</div>}
                <div className="flex items-center justify-between text-xs">
                  {row.debit > 0 && <span className="text-emerald-400">Dr {fmt(row.debit)}</span>}
                  {row.credit > 0 && <span className="text-red-400 ml-auto">Cr {fmt(row.credit)}</span>}
                </div>
              </MobileCard>
            ))}
          </MobileCardList>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
            <span className="text-sm text-surface-400">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, data.length)} of {data.length}
            </span>
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

export default LedgerPage;

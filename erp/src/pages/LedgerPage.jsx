import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts, fetchAccountLedger } from "@/services/accounts.service";
import { BookOpen, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 }).format(n ?? 0);

const today = new Date();
const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
const todayStr = today.toISOString().split("T")[0];

const PAGE_SIZE = 10;

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

  const { data: ledger = [], isLoading, isFetching } = useQuery({
    queryKey: ["ledger", accountId, from, to],
    queryFn: () => fetchAccountLedger(accountId, from, to),
    enabled: !!accountId && !!from && !!to,
    staleTime: 0,
  });

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const totalDebits = ledger.reduce((s, r) => s + Number(r.debit ?? 0), 0);
  const totalCredits = ledger.reduce((s, r) => s + Number(r.credit ?? 0), 0);
  const closingBalance = ledger.length ? Number(ledger[ledger.length - 1].running_balance) : 0;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(ledger.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = ledger.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const inputCls = "px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">Account</label>
            <select className={`w-full ${inputCls}`} value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1); }}>
              <option value="">Select account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
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
      {accountId && (
        <div className="grid grid-cols-3 gap-4">
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
          <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Minus size={15} className="text-primary-400" />
              <span className="text-xs text-surface-400 uppercase tracking-wider">Closing Balance</span>
            </div>
            <p className={`text-xl font-bold ${closingBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(closingBalance)}</p>
          </div>
        </div>
      )}

      {/* Ledger table */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary-400" />
            <h2 className="font-semibold text-white">
              {selectedAccount ? `${selectedAccount.code} – ${selectedAccount.name}` : "General Ledger"}
            </h2>
          </div>
          {isFetching && <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />}
        </div>

        {!accountId ? (
          <div className="py-16 text-center text-surface-500">
            <BookOpen size={40} className="mx-auto mb-3 text-surface-700" />
            <p>Select an account to view its ledger</p>
          </div>
        ) : isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ledger.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <p>No transactions in this period</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
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
                      <td className="px-4 py-3 text-surface-300 whitespace-nowrap">
                        {new Date(row.entry_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
              <span className="text-sm text-surface-400">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, ledger.length)} of {ledger.length}
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
          </>
        )}
      </div>
    </div>
  );
};

export default LedgerPage;
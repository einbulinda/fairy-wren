import { useState, useMemo } from "react";
import { Link } from "react-router";
import { useCheques, useClearCheque, useVoidCheque } from "@/hooks/useCheques";
import { CheckCircle, XCircle, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { MobileCard, MobileField, MobileCardList } from "@/components/shared/MobileCard";
import { fmt, localDateStr } from "@/utils/formatters";
import { CHEQUE_STATUS_STYLES as STATUS_STYLES } from "@/utils/constants";

const PAGE_SIZE = 10;

// Default to the current month
const defaultFrom = localDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const defaultTo = localDateStr();

const PaymentRegisterPage = () => {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState(defaultFrom);
  const [filterTo, setFilterTo] = useState(defaultTo);
  const [page, setPage] = useState(1);

  const filters = useMemo(() => {
    const f = {};
    if (filterStatus) f.status = filterStatus;
    if (filterFrom) f.from = filterFrom;
    if (filterTo) f.to = filterTo;
    return f;
  }, [filterStatus, filterFrom, filterTo]);

  const { data: cheques = [], isLoading } = useCheques(filters);
  const clearMutation = useClearCheque();
  const voidMutation = useVoidCheque();

  const issuedTotal  = cheques.filter((c) => c.status === "issued").reduce((s, c) => s + Number(c.amount), 0);
  const clearedTotal = cheques.filter((c) => c.status === "cleared").reduce((s, c) => s + Number(c.amount), 0);

  const totalPages = Math.max(1, Math.ceil(cheques.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = cheques.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleClear = (id, ref) => {
    if (!confirm(`Mark ${ref} as cleared?`)) return;
    clearMutation.mutate(id);
  };

  const handleVoid = (id, ref) => {
    if (!confirm(`Void ${ref}? A reversing journal entry will be created.`)) return;
    voidMutation.mutate(id);
  };

  const resetToCurrentMonth = () => {
    setFilterStatus("");
    setFilterFrom(defaultFrom);
    setFilterTo(defaultTo);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Payment Register</h1>
        <p className="text-sm text-surface-400 mt-0.5">History of cheques, expense payments and transfers</p>
      </div>

      {/* Stats (for the current filter) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Issued (Outstanding)</p>
          <p className="text-xl font-bold text-primary-400">{fmt(issuedTotal)}</p>
          <p className="text-xs text-surface-500 mt-0.5">{cheques.filter((c) => c.status === "issued").length} records</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Cleared</p>
          <p className="text-xl font-bold text-emerald-400">{fmt(clearedTotal)}</p>
          <p className="text-xs text-surface-500 mt-0.5">{cheques.filter((c) => c.status === "cleared").length} records</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Total (Filtered)</p>
          <p className="text-xl font-bold text-white">{cheques.length}</p>
          <p className="text-xs text-surface-500 mt-0.5">{cheques.filter((c) => c.status === "voided").length} voided</p>
        </div>
      </div>

      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <h2 className="font-semibold text-white sm:mr-auto">Records</h2>
          <select className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none w-full sm:w-auto"
            value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="issued">Issued</option>
            <option value="cleared">Cleared</option>
            <option value="voided">Voided</option>
          </select>
          <div className="flex items-center gap-2">
            <input type="date" className="flex-1 sm:flex-none px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
              value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }} />
            <span className="text-surface-500 shrink-0">→</span>
            <input type="date" className="flex-1 sm:flex-none px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
              value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }} />
          </div>
          <button onClick={resetToCurrentMonth}
            className="text-sm text-primary-400 hover:text-primary-300 transition-colors whitespace-nowrap">
            This Month
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cheques.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <Receipt size={36} className="mx-auto mb-3 text-surface-700" />
            <p>No records found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-900/50 border-b border-surface-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Payee / Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">From Account</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/50">
                  {pageItems.map((c) => {
                    const s = STATUS_STYLES[c.status] || STATUS_STYLES.issued;
                    const Icon = s.icon;
                    const typeLabel = c.transaction_type === "transfer"
                      ? "Transfer"
                      : c.payee_type === "expense"
                        ? "Expense"
                        : c.payee_type === "supplier"
                          ? "Supplier"
                          : "Payment";
                    return (
                      <tr key={c.id} className="hover:bg-surface-700/30 transition-colors">
                        <td className="px-4 py-3 font-mono">
                          <Link to={`/cheques/${c.id}`} className="text-primary-400 hover:text-primary-300 hover:underline transition-colors">
                            {c.cheque_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{c.payee_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-surface-500">{typeLabel}</span>
                            {c.memo && <span className="text-xs text-surface-600">{c.memo}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-surface-300">{c.bank_account?.name || "—"}</td>
                        <td className="px-4 py-3 text-surface-300">
                          {new Date(c.cheque_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">{fmt(c.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                            <Icon size={11} /> {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            {c.status === "issued" && (
                              <>
                                <button onClick={() => handleClear(c.id, c.cheque_number)}
                                  className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs rounded-lg flex items-center gap-1 transition-colors">
                                  <CheckCircle size={12} /> Clear
                                </button>
                                <button onClick={() => handleVoid(c.id, c.cheque_number)}
                                  className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs rounded-lg flex items-center gap-1 transition-colors">
                                  <XCircle size={12} /> Void
                                </button>
                              </>
                            )}
                            {c.status === "cleared" && (
                              <button disabled title="Cleared cheques cannot be voided"
                                className="px-2.5 py-1 bg-surface-700/50 text-surface-500 text-xs rounded-lg flex items-center gap-1 cursor-not-allowed">
                                <XCircle size={12} /> Void
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <MobileCardList>
              {pageItems.map((c) => {
                const s = STATUS_STYLES[c.status] || STATUS_STYLES.issued;
                const Icon = s.icon;
                const typeLabel = c.transaction_type === "transfer" ? "Transfer"
                  : c.payee_type === "expense" ? "Expense"
                  : c.payee_type === "supplier" ? "Supplier" : "Payment";
                return (
                  <MobileCard key={c.id}>
                    <div className="flex items-center justify-between">
                      <Link to={`/cheques/${c.id}`} className="font-mono text-primary-400 hover:text-primary-300 hover:underline text-sm transition-colors">
                        {c.cheque_number}
                      </Link>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                        <Icon size={11} /> {s.label}
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm">{c.payee_name}</p>
                    <div className="text-xs text-surface-500">
                      {typeLabel}
                      {c.memo && <span className="text-surface-600 ml-2">{c.memo}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold tabular-nums">{fmt(c.amount)}</span>
                      <span className="text-surface-400 text-xs">
                        {new Date(c.cheque_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}
                      </span>
                    </div>
                    <MobileField label="From">{c.bank_account?.name || "—"}</MobileField>
                    {(c.status === "issued" || c.status === "cleared") && (
                      <div className="flex gap-1.5 pt-1">
                        {c.status === "issued" && (
                          <>
                            <button onClick={() => handleClear(c.id, c.cheque_number)}
                              className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs rounded-lg flex items-center gap-1 transition-colors">
                              <CheckCircle size={12} /> Clear
                            </button>
                            <button onClick={() => handleVoid(c.id, c.cheque_number)}
                              className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs rounded-lg flex items-center gap-1 transition-colors">
                              <XCircle size={12} /> Void
                            </button>
                          </>
                        )}
                        {c.status === "cleared" && (
                          <button disabled title="Cleared cheques cannot be voided"
                            className="px-2.5 py-1 bg-surface-700/50 text-surface-500 text-xs rounded-lg flex items-center gap-1 cursor-not-allowed">
                            <XCircle size={12} /> Void
                          </button>
                        )}
                      </div>
                    )}
                  </MobileCard>
                );
              })}
            </MobileCardList>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
                <span className="text-sm text-surface-400">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, cheques.length)} of {cheques.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 text-xs text-surface-400">{safePage} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors">
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

export default PaymentRegisterPage;

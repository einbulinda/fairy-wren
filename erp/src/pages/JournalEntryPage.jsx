import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts } from "@/services/accounts.service";
import { useJournals, useCreateJournal, useVoidJournal } from "@/hooks/useJournals";
import {
  Plus, Trash2, AlertCircle, CheckCircle, BookOpen,
  Filter, Eye, XCircle, ChevronDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 }).format(n ?? 0);

const today = new Date().toISOString().split("T")[0];

const EMPTY_LINE = { account_id: "", description: "", debit: "", credit: "" };

const SOURCE_LABELS = {
  manual: "Manual",
  payment: "Payment",
  expense: "Expense",
  supplier_bill: "Supplier Bill",
  cheque: "Cheque",
  customer_invoice: "Invoice",
};

const inputCls = "px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

const PAGE_SIZE = 10;

const JournalEntryPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterSource, setFilterSource] = useState("manual");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);

  // Form state
  const [entryDate, setEntryDate] = useState(today);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts({ active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const filters = useMemo(() => {
    const f = {};
    if (filterSource) f.source_type = filterSource;
    if (filterFrom) f.from = filterFrom;
    if (filterTo) f.to = filterTo;
    return f;
  }, [filterSource, filterFrom, filterTo]);

  const { data: journals = [], isLoading } = useJournals(filters);
  const createMutation = useCreateJournal();
  const voidMutation = useVoidJournal();

  // Pagination
  const totalPages = Math.max(1, Math.ceil(journals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = journals.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const totalDebits = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredits = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001 && totalDebits > 0;
  const diff = totalDebits - totalCredits;

  const updateLine = (i, field, value) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);

  const removeLine = (i) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  };

  const resetForm = () => {
    setEntryDate(today);
    setReference("");
    setDescription("");
    setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
    setShowForm(false);
  };

  const handleSubmit = () => {
    const validLines = lines.filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) { toast.error("At least 2 lines with amounts required"); return; }
    if (!isBalanced) { toast.error("Debits must equal credits"); return; }

    createMutation.mutate(
      {
        entry_date: entryDate,
        reference: reference || undefined,
        description: description || undefined,
        lines: validLines.map((l) => ({
          account_id: l.account_id,
          description: l.description || undefined,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      },
      { onSuccess: resetForm }
    );
  };

  const handleVoid = (id) => {
    if (!confirm("Void this journal entry? A reversing entry will be created.")) return;
    voidMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select className={`${inputCls} text-sm`} value={filterSource} onChange={(e) => { setFilterSource(e.target.value); setPage(1); }}>
            <option value="">All Sources</option>
            {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="date" className={`${inputCls} text-sm`} value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }} placeholder="From" />
          <input type="date" className={`${inputCls} text-sm`} value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }} placeholder="To" />
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={15} /> New Journal Entry
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <BookOpen size={16} className="text-primary-400" /> New Journal Entry
            </h2>
            <button onClick={resetForm} className="text-surface-400 hover:text-white"><XCircle size={18} /></button>
          </div>

          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Entry Date *</label>
              <input type="date" className={`w-full ${inputCls}`} value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Reference</label>
              <input className={`w-full ${inputCls}`} placeholder="JNL-001" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Description</label>
              <input className={`w-full ${inputCls}`} placeholder="Narration..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Lines */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="pb-2 text-left text-xs text-surface-400 font-medium">Account *</th>
                  <th className="pb-2 text-left text-xs text-surface-400 font-medium pl-2">Line Description</th>
                  <th className="pb-2 text-right text-xs text-surface-400 font-medium pl-2 w-32">Debit</th>
                  <th className="pb-2 text-right text-xs text-surface-400 font-medium pl-2 w-32">Credit</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/40">
                {lines.map((line, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-2">
                      <select className={`w-full ${inputCls} py-1.5`} value={line.account_id}
                        onChange={(e) => updateLine(i, "account_id", e.target.value)}>
                        <option value="">Select account...</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <input className={`w-full ${inputCls} py-1.5`} placeholder="Optional" value={line.description}
                        onChange={(e) => updateLine(i, "description", e.target.value)} />
                    </td>
                    <td className="py-1.5 px-2">
                      <input type="number" min="0" step="0.01" className={`w-full ${inputCls} py-1.5 text-right`}
                        placeholder="0.00" value={line.debit}
                        onChange={(e) => updateLine(i, "debit", e.target.value)}
                        onFocus={() => line.credit && updateLine(i, "credit", "")} />
                    </td>
                    <td className="py-1.5 px-2">
                      <input type="number" min="0" step="0.01" className={`w-full ${inputCls} py-1.5 text-right`}
                        placeholder="0.00" value={line.credit}
                        onChange={(e) => updateLine(i, "credit", e.target.value)}
                        onFocus={() => line.debit && updateLine(i, "debit", "")} />
                    </td>
                    <td className="py-1.5 pl-2">
                      <button onClick={() => removeLine(i)} disabled={lines.length <= 2}
                        className="p-1 text-surface-500 hover:text-red-400 disabled:opacity-30 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-surface-600">
                <tr>
                  <td colSpan={2} className="pt-2">
                    <button onClick={addLine} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                      <Plus size={13} /> Add line
                    </button>
                  </td>
                  <td className="pt-2 text-right font-bold text-white pr-2">{fmt(totalDebits)}</td>
                  <td className="pt-2 text-right font-bold text-white pr-2">{fmt(totalCredits)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance indicator */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${isBalanced ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
            {isBalanced
              ? <><CheckCircle size={16} className="text-emerald-400" /><span className="text-emerald-400 text-sm font-medium">Balanced — ready to post</span></>
              : <><AlertCircle size={16} className="text-red-400" /><span className="text-red-400 text-sm">
                  {totalDebits === 0 && totalCredits === 0 ? "Enter amounts above" : `Out of balance by ${fmt(Math.abs(diff))}`}
                </span></>
            }
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white text-sm rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={!isBalanced || createMutation.isPending}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
              <BookOpen size={15} /> {createMutation.isPending ? "Posting…" : "Post Entry"}
            </button>
          </div>
        </div>
      )}

      {/* Journal list */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700">
          <h2 className="font-semibold text-white">
            Journal Entries <span className="text-surface-400 font-normal text-sm">({journals.length})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : journals.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <BookOpen size={36} className="mx-auto mb-3 text-surface-700" />
            <p>No journal entries found</p>
          </div>
        ) : (
          <>
          <div className="divide-y divide-surface-700/50">
            {pageItems.map((j) => {
              const isExpanded = expandedId === j.id;
              const totalDr = j.journal_lines?.reduce((s, l) => s + Number(l.debit ?? 0), 0) ?? 0;
              const isVoided = !!j.reversed_entry_id;
              return (
                <div key={j.id}>
                  <div className="px-4 py-3 flex items-center gap-3 hover:bg-surface-700/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : j.id)}>
                    {isExpanded ? <ChevronDown size={15} className="text-surface-400 shrink-0" /> : <ChevronRight size={15} className="text-surface-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{j.description || j.reference || `JNL-${j.id.slice(0, 8)}`}</span>
                        {j.reference && j.description && <span className="text-surface-500 text-xs font-mono">{j.reference}</span>}
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${j.source_type === "manual" ? "bg-primary-500/15 text-primary-300" : "bg-surface-700 text-surface-300"}`}>
                          {SOURCE_LABELS[j.source_type] || j.source_type}
                        </span>
                        {isVoided && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400">Voided</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-surface-500">
                        <span>{new Date(j.entry_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        <span>{j.journal_lines?.length ?? 0} lines</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-medium text-sm">{fmt(totalDr)}</p>
                    </div>
                    {j.source_type === "manual" && !isVoided && (
                      <button onClick={(e) => { e.stopPropagation(); handleVoid(j.id); }}
                        className="p-1.5 text-surface-500 hover:text-red-400 transition-colors shrink-0" title="Void entry">
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>

                  {isExpanded && j.journal_lines && (
                    <div className="px-8 pb-3 bg-surface-900/40">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-surface-500">
                            <th className="py-1.5 text-left font-medium">Account</th>
                            <th className="py-1.5 text-left font-medium pl-4">Description</th>
                            <th className="py-1.5 text-right font-medium">Debit</th>
                            <th className="py-1.5 text-right font-medium">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700/30">
                          {j.journal_lines.map((l) => (
                            <tr key={l.id}>
                              <td className="py-1.5 text-surface-300">
                                {l.chart_of_accounts?.name || l.account_id}
                              </td>
                              <td className="py-1.5 text-surface-400 pl-4">{l.description || ""}</td>
                              <td className="py-1.5 text-right text-emerald-400">{Number(l.debit) > 0 ? fmt(l.debit) : ""}</td>
                              <td className="py-1.5 text-right text-red-400">{Number(l.credit) > 0 ? fmt(l.credit) : ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
              <span className="text-sm text-surface-400">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, journals.length)} of {journals.length}
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

export default JournalEntryPage;
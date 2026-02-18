import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts } from "@/services/accounts.service";
import { useCheques, useCreateCheque, useClearCheque, useVoidCheque } from "@/hooks/useCheques";
import { Plus, CheckCircle, XCircle, Clock, Receipt, Building2, DollarSign, X } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 }).format(n ?? 0);

const today = new Date().toISOString().split("T")[0];

const STATUS_STYLES = {
  issued:  { label: "Issued",  icon: Clock,         cls: "bg-primary-500/15 text-primary-300" },
  cleared: { label: "Cleared", icon: CheckCircle,   cls: "bg-emerald-500/15 text-emerald-400" },
  voided:  { label: "Voided",  icon: XCircle,       cls: "bg-red-500/15 text-red-400" },
};

const inputCls = "w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

const EMPTY_FORM = {
  cheque_number: "", payee_name: "", bank_account_id: "", debit_account_id: "",
  amount: "", cheque_date: today, memo: "",
};

const ChequeWritingPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts({ active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const filters = useMemo(() => {
    const f = {};
    if (filterStatus) f.status = filterStatus;
    if (filterFrom) f.from = filterFrom;
    if (filterTo) f.to = filterTo;
    return f;
  }, [filterStatus, filterFrom, filterTo]);

  const { data: cheques = [], isLoading } = useCheques(filters);
  const createMutation = useCreateCheque();
  const clearMutation = useClearCheque();
  const voidMutation = useVoidCheque();

  // Separate bank accounts (asset class) from expense/liability accounts
  const bankAccounts = accounts.filter((a) =>
    a.account_class === "asset" && a.name.toLowerCase().includes("bank")
  );
  const debitAccounts = accounts.filter((a) =>
    ["expense", "liability", "cost_of_sales"].includes(a.account_class)
  );

  const handleSubmit = () => {
    if (!form.cheque_number || !form.payee_name || !form.bank_account_id || !form.debit_account_id || !form.amount) {
      return;
    }
    createMutation.mutate(
      { ...form, amount: parseFloat(form.amount) },
      { onSuccess: () => { setForm(EMPTY_FORM); setShowForm(false); } }
    );
  };

  const handleClear = (id, chequeNumber) => {
    if (!confirm(`Mark cheque ${chequeNumber} as cleared?`)) return;
    clearMutation.mutate(id);
  };

  const handleVoid = (id, chequeNumber) => {
    if (!confirm(`Void cheque ${chequeNumber}? A reversing journal entry will be created.`)) return;
    voidMutation.mutate(id);
  };

  // Stats
  const issuedTotal = cheques.filter((c) => c.status === "issued").reduce((s, c) => s + Number(c.amount), 0);
  const clearedTotal = cheques.filter((c) => c.status === "cleared").reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Issued (Outstanding)</p>
          <p className="text-xl font-bold text-primary-400">{fmt(issuedTotal)}</p>
          <p className="text-xs text-surface-500 mt-0.5">{cheques.filter((c) => c.status === "issued").length} cheques</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Cleared</p>
          <p className="text-xl font-bold text-emerald-400">{fmt(clearedTotal)}</p>
          <p className="text-xs text-surface-500 mt-0.5">{cheques.filter((c) => c.status === "cleared").length} cheques</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Total Cheques</p>
          <p className="text-xl font-bold text-white">{cheques.length}</p>
          <p className="text-xs text-surface-500 mt-0.5">{cheques.filter((c) => c.status === "voided").length} voided</p>
        </div>
      </div>

      {/* Issue cheque form */}
      {showForm && (
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Receipt size={16} className="text-primary-400" /> Issue New Cheque
            </h2>
            <button onClick={() => setShowForm(false)} className="text-surface-400 hover:text-white"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Cheque Number *</label>
              <input className={inputCls} placeholder="001" value={form.cheque_number}
                onChange={(e) => setForm({ ...form, cheque_number: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Cheque Date *</label>
              <input type="date" className={inputCls} value={form.cheque_date}
                onChange={(e) => setForm({ ...form, cheque_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Amount *</label>
              <input type="number" min="0.01" step="0.01" className={inputCls} placeholder="0.00" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs text-surface-400 font-medium">Pay To *</label>
              <input className={inputCls} placeholder="Payee name" value={form.payee_name}
                onChange={(e) => setForm({ ...form, payee_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Bank Account *</label>
              <select className={inputCls} value={form.bank_account_id}
                onChange={(e) => setForm({ ...form, bank_account_id: e.target.value })}>
                <option value="">Select bank account…</option>
                {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
                {bankAccounts.length === 0 && accounts.filter((a) => a.account_class === "asset").map((a) =>
                  <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
                )}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Charge Account *</label>
              <select className={inputCls} value={form.debit_account_id}
                onChange={(e) => setForm({ ...form, debit_account_id: e.target.value })}>
                <option value="">Select expense/liability…</option>
                {debitAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-surface-400 font-medium">Memo</label>
              <input className={inputCls} placeholder="Purpose of cheque..." value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })} />
            </div>
          </div>

          {/* Journal preview */}
          {form.amount && form.bank_account_id && form.debit_account_id && (
            <div className="bg-surface-900/50 border border-surface-700 rounded-lg p-3 text-xs">
              <p className="text-surface-400 mb-2 font-medium">Journal Entry Preview</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-white">Dr {debitAccounts.find((a) => a.id === form.debit_account_id)?.name || "Charge Account"}</span>
                  <span className="text-emerald-400">{fmt(parseFloat(form.amount) || 0)}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-white">Cr {bankAccounts.find((a) => a.id === form.bank_account_id)?.name || accounts.find((a) => a.id === form.bank_account_id)?.name || "Bank Account"}</span>
                  <span className="text-red-400">{fmt(parseFloat(form.amount) || 0)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white text-sm rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit}
              disabled={!form.cheque_number || !form.payee_name || !form.bank_account_id || !form.debit_account_id || !form.amount || createMutation.isPending}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
              <Receipt size={15} /> {createMutation.isPending ? "Issuing…" : "Issue Cheque"}
            </button>
          </div>
        </div>
      )}

      {/* Cheque register */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-white mr-auto">Cheque Register</h2>
          <select className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="issued">Issued</option>
            <option value="cleared">Cleared</option>
            <option value="voided">Voided</option>
          </select>
          <input type="date" className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          <input type="date" className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus size={15} /> Issue Cheque
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : cheques.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <Receipt size={36} className="mx-auto mb-3 text-surface-700" />
            <p>No cheques found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50 border-b border-surface-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Cheque No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Payee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Bank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {cheques.map((c) => {
                  const s = STATUS_STYLES[c.status] || STATUS_STYLES.issued;
                  const Icon = s.icon;
                  return (
                    <tr key={c.id} className="hover:bg-surface-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-white">{c.cheque_number}</td>
                      <td className="px-4 py-3 text-white font-medium">
                        {c.payee_name}
                        {c.memo && <p className="text-xs text-surface-500 mt-0.5">{c.memo}</p>}
                      </td>
                      <td className="px-4 py-3 text-surface-300">{c.bank_account?.name || "—"}</td>
                      <td className="px-4 py-3 text-surface-300">
                        {new Date(c.cheque_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
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
                            <button onClick={() => handleVoid(c.id, c.cheque_number)}
                              className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs rounded-lg flex items-center gap-1 transition-colors">
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
        )}
      </div>
    </div>
  );
};

export default ChequeWritingPage;
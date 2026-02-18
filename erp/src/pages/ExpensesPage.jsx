import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchExpenses, createExpense } from "@/services/expenses.service";
import { fetchAccounts } from "@/services/accounts.service";
import { fetchSuppliers } from "@/services/suppliers.service";
import {
  Plus, Calendar, DollarSign, FileText, Building2, Receipt,
  TrendingDown, Search, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import toast from "react-hot-toast";

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 }).format(n ?? 0);

const ITEMS_PER_PAGE = 12;
const EMPTY_FORM = { expense_date: "", supplier_id: "", account_id: "", amount: "", invoice_number: "", description: "" };

const inputCls = "w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

const ExpensesPage = () => {
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ["expenses"], queryFn: fetchExpenses, staleTime: 2 * 60 * 1000 });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: () => fetchAccounts({ active: true }), staleTime: 5 * 60 * 1000 });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers, staleTime: 5 * 60 * 1000 });

  const expenseAccounts = accounts.filter((a) => ["expense", "cost_of_sales"].includes(a.account_class));

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense recorded");
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to save expense"),
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let r = expenses;
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((e) =>
        e.chart_of_accounts?.name?.toLowerCase().includes(s) ||
        e.suppliers?.name?.toLowerCase().includes(s) ||
        e.invoice_number?.toLowerCase().includes(s) ||
        e.description?.toLowerCase().includes(s)
      );
    }
    if (filterFrom) r = r.filter((e) => e.expense_date >= filterFrom);
    if (filterTo) r = r.filter((e) => e.expense_date <= filterTo);
    if (filterSupplier) r = r.filter((e) => e.supplier_id === filterSupplier);
    if (filterAccount) r = r.filter((e) => e.account_id === filterAccount);
    return r;
  }, [expenses, search, filterFrom, filterTo, filterSupplier, filterAccount]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalAmount = filtered.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const hasFilters = search || filterFrom || filterTo || filterSupplier || filterAccount;

  const clearFilters = () => { setSearch(""); setFilterFrom(""); setFilterTo(""); setFilterSupplier(""); setFilterAccount(""); setCurrentPage(1); };

  const handleSave = () => {
    if (!form.expense_date || !form.account_id || !form.amount) {
      toast.error("Date, account, and amount are required");
      return;
    }
    createMutation.mutate({ ...form, amount: parseFloat(form.amount), supplier_id: form.supplier_id || null });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 sm:col-span-2">
          <div className="flex items-center gap-2 text-surface-400 text-xs mb-1"><TrendingDown size={14} /> Total Expenses (filtered)</div>
          <p className="text-2xl font-bold text-red-400">{fmt(totalAmount)}</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="text-surface-400 text-xs mb-1">All Time</div>
          <p className="text-xl font-bold text-white">{expenses.length} records</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="text-surface-400 text-xs mb-1">Filtered</div>
          <p className="text-xl font-bold text-white">{filtered.length} records</p>
        </div>
      </div>

      {/* Add expense form */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-primary-500/15 rounded-lg"><Plus size={15} className="text-primary-400" /></div>
          <h2 className="font-semibold text-white">Record Expense</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium flex items-center gap-1"><Calendar size={12} /> Date *</label>
            <input type="date" className={inputCls} value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium flex items-center gap-1"><FileText size={12} /> Expense Account *</label>
            <select className={inputCls} value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
              <option value="">Select account…</option>
              {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium flex items-center gap-1"><DollarSign size={12} /> Amount *</label>
            <input type="number" min="0.01" step="0.01" className={inputCls} placeholder="0.00"
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium flex items-center gap-1"><Building2 size={12} /> Supplier</label>
            <select className={inputCls} value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">No supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium flex items-center gap-1"><Receipt size={12} /> Invoice No</label>
            <input className={inputCls} placeholder="INV-001" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium flex items-center gap-1"><FileText size={12} /> Description</label>
            <input className={inputCls} placeholder="Brief description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} disabled={!form.expense_date || !form.account_id || !form.amount || createMutation.isPending}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
            <Plus size={15} /> {createMutation.isPending ? "Saving…" : "Add Expense"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input className="w-full pl-9 pr-8 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Search expenses..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white"><X size={14} /></button>}
          </div>
          <input type="date" className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setCurrentPage(1); }} />
          <input type="date" className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setCurrentPage(1); }} />
          <select className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterSupplier} onChange={(e) => { setFilterSupplier(e.target.value); setCurrentPage(1); }}>
            <option value="">All Suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterAccount} onChange={(e) => { setFilterAccount(e.target.value); setCurrentPage(1); }}>
            <option value="">All Accounts</option>
            {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {hasFilters && <button onClick={clearFilters} className="text-sm text-primary-400 hover:text-primary-300 transition-colors">Clear</button>}
        </div>
      </div>

      {/* Expense list */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex items-center justify-between">
          <h2 className="font-semibold text-white">Expenses</h2>
          <span className="text-xs text-surface-400">{filtered.length} records</span>
        </div>

        {paginated.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <Receipt size={36} className="mx-auto mb-3 text-surface-700" />
            <p>{hasFilters ? "No expenses match your filters" : "No expenses recorded yet"}</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-700/50">
            {paginated.map((e) => (
              <div key={e.id} className="px-4 py-3 hover:bg-surface-700/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg shrink-0">
                    <Receipt size={16} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-white font-medium text-sm">{e.chart_of_accounts?.name || "—"}</p>
                        <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-surface-500">
                          {e.suppliers?.name && <span className="flex items-center gap-1"><Building2 size={11} />{e.suppliers.name}</span>}
                          <span className="flex items-center gap-1"><Calendar size={11} />
                            {new Date(e.expense_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          {e.invoice_number && <span className="flex items-center gap-1"><Receipt size={11} />{e.invoice_number}</span>}
                          {e.description && <span className="text-surface-600">{e.description}</span>}
                        </div>
                      </div>
                      <p className="text-red-400 font-bold text-sm shrink-0">{fmt(e.amount)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-700 flex items-center justify-between text-sm">
            <span className="text-surface-400">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-1.5 bg-surface-700/50 hover:bg-surface-700 disabled:opacity-40 rounded-lg transition-colors">
                <ChevronLeft size={15} className="text-white" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${currentPage === p ? "bg-primary-600 text-white" : "bg-surface-700/50 hover:bg-surface-700 text-surface-300"}`}>{p}</button>
                );
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="p-1.5 bg-surface-700/50 hover:bg-surface-700 disabled:opacity-40 rounded-lg transition-colors">
                <ChevronRight size={15} className="text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesPage;
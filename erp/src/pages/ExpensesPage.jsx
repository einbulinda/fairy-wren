import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchExpenses, createExpense } from "@/services/expenses.service";
import { fetchAccounts } from "@/services/accounts.service";
import { fetchSuppliers } from "@/services/suppliers.service";
import {
  Plus, Calendar, DollarSign, FileText, Building2, Receipt,
  TrendingDown, Search, ChevronDown, ChevronRight, X, Wallet,
  ChevronsDownUp, ChevronsUpDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { MobileCard, MobileField, MobileCardList } from "@/components/shared/MobileCard";
import { fmt } from "@/utils/formatters";
import { inputCls } from "@/utils/constants";

const EMPTY_FORM = { expense_date: "", supplier_id: "", account_id: "", credit_account_id: "", amount: "", invoice_number: "", description: "" };

const sourceBadge = (source) => {
  const cls = source === "expense" ? "bg-primary-500/15 text-primary-400" : "bg-amber-500/15 text-amber-400";
  const label = source === "expense" ? "Direct" : source === "cheque" ? "Cheque" : "Journal";
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>{label}</span>;
};

// Build hierarchy: parent accounts → child accounts → transactions
const buildExpenseTree = (expenses, allAccounts) => {
  // Group transactions by account_id
  const byAccount = {};
  expenses.forEach((e) => {
    if (!byAccount[e.account_id]) {
      byAccount[e.account_id] = {
        account_id: e.account_id,
        account_name: e.account_name,
        account_code: e.account_code,
        parent_id: e.parent_id,
        total: 0,
        transactions: [],
      };
    }
    byAccount[e.account_id].total += Number(e.amount ?? 0);
    byAccount[e.account_id].transactions.push(e);
  });

  // Build parent → children map
  // Find parent accounts from chart of accounts that have expense children with data
  const parentMap = {};
  const orphans = [];

  Object.values(byAccount).forEach((acct) => {
    const parentId = acct.parent_id;
    if (parentId) {
      if (!parentMap[parentId]) {
        // Look up parent info from accounts list
        const parentAcct = allAccounts.find((a) => a.id === parentId);
        parentMap[parentId] = {
          account_id: parentId,
          account_name: parentAcct?.name || "Other Expenses",
          account_code: parentAcct?.code || "",
          total: 0,
          children: [],
        };
      }
      parentMap[parentId].children.push(acct);
      parentMap[parentId].total += acct.total;
    } else {
      // This is a top-level account with direct transactions
      orphans.push(acct);
    }
  });

  // Merge orphans (top-level accounts with direct transactions) into the tree
  // They act as both parent and leaf
  orphans.forEach((acct) => {
    if (!parentMap[acct.account_id]) {
      parentMap[acct.account_id] = {
        account_id: acct.account_id,
        account_name: acct.account_name,
        account_code: acct.account_code,
        total: acct.total,
        children: [],
        transactions: acct.transactions,
      };
    } else {
      // Parent already exists from children, add its own transactions
      parentMap[acct.account_id].transactions = acct.transactions;
      parentMap[acct.account_id].total += acct.total;
    }
  });

  // Sort parents by code, children by code, transactions by date desc
  return Object.values(parentMap)
    .sort((a, b) => (a.account_code || "").localeCompare(b.account_code || ""))
    .map((parent) => ({
      ...parent,
      children: parent.children.sort((a, b) => (a.account_code || "").localeCompare(b.account_code || "")),
    }));
};

const TransactionTable = ({ transactions }) => (
  <tr>
    <td colSpan={3} className="p-0">
      <div className="bg-surface-900/40 border-t border-surface-700/50">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-surface-500 border-b border-surface-700/30">
              <th className="px-6 py-1.5 text-left font-medium">Date</th>
              <th className="px-3 py-1.5 text-left font-medium">Supplier</th>
              <th className="px-3 py-1.5 text-left font-medium">Invoice / Ref</th>
              <th className="px-3 py-1.5 text-left font-medium">Description</th>
              <th className="px-3 py-1.5 text-left font-medium">Source</th>
              <th className="px-4 py-1.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/30">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-surface-700/20 transition-colors">
                <td className="px-6 py-2 text-surface-400">
                  {new Date(t.txn_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-3 py-2 text-surface-300">{t.supplier_name || "—"}</td>
                <td className="px-3 py-2 text-surface-400">{t.invoice_number || "—"}</td>
                <td className="px-3 py-2 text-surface-400 max-w-48 truncate">{t.description || "—"}</td>
                <td className="px-3 py-2">{sourceBadge(t.source)}</td>
                <td className="px-4 py-2 text-right text-red-400 tabular-nums">{fmt(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </td>
  </tr>
);

const ChildAccountRow = ({ child, expanded, onToggle }) => (
  <>
    <tr
      className="hover:bg-surface-700/30 transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5" style={{ paddingLeft: "24px" }}>
          <button className="p-0.5 rounded hover:bg-surface-600 text-surface-400">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          <span className="text-surface-300 text-sm">{child.account_name}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right text-surface-400 text-xs tabular-nums">{child.transactions.length}</td>
      <td className="px-4 py-2.5 text-right text-red-400 tabular-nums text-sm">{fmt(child.total)}</td>
    </tr>
    {expanded && <TransactionTable transactions={child.transactions} />}
  </>
);

const ParentAccountRow = ({ parent, expandedSet, onToggle }) => {
  const parentExpanded = expandedSet.has(parent.account_id);
  const hasChildren = parent.children.length > 0;
  const hasOwnTxns = parent.transactions?.length > 0;

  return (
    <>
      <tr
        className="hover:bg-surface-700/30 transition-colors cursor-pointer bg-surface-800/30"
        onClick={() => onToggle(parent.account_id)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button className="p-0.5 rounded hover:bg-surface-600 text-surface-400">
              {parentExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <span className="text-white font-medium text-sm">{parent.account_name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right text-surface-400 text-xs tabular-nums">
          {parent.children.reduce((s, c) => s + c.transactions.length, 0) + (parent.transactions?.length || 0)}
        </td>
        <td className="px-4 py-3 text-right text-red-400 font-semibold tabular-nums">{fmt(parent.total)}</td>
      </tr>
      {parentExpanded && (
        <>
          {hasChildren && parent.children.map((child) => (
            <ChildAccountRow
              key={child.account_id}
              child={child}
              expanded={expandedSet.has(child.account_id)}
              onToggle={() => onToggle(child.account_id)}
            />
          ))}
          {hasOwnTxns && !hasChildren && (
            <TransactionTable transactions={parent.transactions} />
          )}
          {hasOwnTxns && hasChildren && (
            <ChildAccountRow
              child={{
                account_id: parent.account_id + "-direct",
                account_code: parent.account_code,
                account_name: `${parent.account_name} (direct)`,
                total: parent.transactions.reduce((s, t) => s + Number(t.amount ?? 0), 0),
                transactions: parent.transactions,
              }}
              expanded={expandedSet.has(parent.account_id + "-direct")}
              onToggle={() => onToggle(parent.account_id + "-direct")}
            />
          )}
        </>
      )}
    </>
  );
};

const ExpensesPage = () => {
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ["expenses"], queryFn: fetchExpenses, staleTime: 2 * 60 * 1000 });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: () => fetchAccounts({ active: true }), staleTime: 5 * 60 * 1000 });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers, staleTime: 5 * 60 * 1000 });

  const expenseAccounts = accounts.filter((a) => ["expense", "cost_of_sales"].includes(a.account_class));
  const creditAccounts = accounts.filter((a) => a.account_class === "asset" && a.parent_id !== null);

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
  const [expandedSet, setExpandedSet] = useState(() => new Set());

  let filtered = expenses;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((e) =>
      e.account_name?.toLowerCase().includes(s) ||
      e.supplier_name?.toLowerCase().includes(s) ||
      e.invoice_number?.toLowerCase().includes(s) ||
      e.description?.toLowerCase().includes(s)
    );
  }
  if (filterFrom) filtered = filtered.filter((e) => e.txn_date >= filterFrom);
  if (filterTo) filtered = filtered.filter((e) => e.txn_date <= filterTo);
  if (filterSupplier) filtered = filtered.filter((e) => e.supplier_name === suppliers.find((s) => s.id === filterSupplier)?.name);
  if (filterAccount) filtered = filtered.filter((e) => e.account_id === filterAccount);

  const totalAmount = filtered.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const tree = buildExpenseTree(filtered, accounts);

  const hasFilters = search || filterFrom || filterTo || filterSupplier || filterAccount;
  const clearFilters = () => { setSearch(""); setFilterFrom(""); setFilterTo(""); setFilterSupplier(""); setFilterAccount(""); };

  const toggleExpand = (id) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set();
    tree.forEach((p) => {
      allIds.add(p.account_id);
      p.children.forEach((c) => allIds.add(c.account_id));
      if (p.transactions?.length && p.children.length) allIds.add(p.account_id + "-direct");
    });
    setExpandedSet(allIds);
  };

  const collapseAll = () => setExpandedSet(new Set());

  const handleSave = () => {
    if (!form.expense_date || !form.account_id || !form.credit_account_id || !form.amount) {
      toast.error("Date, expense account, paid from account, and amount are required");
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
          <div className="flex items-center gap-2 text-surface-400 text-xs mb-1"><TrendingDown size={14} /> Total Expenses{hasFilters ? " (filtered)" : ""}</div>
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
              {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium flex items-center gap-1"><Wallet size={12} /> Paid From *</label>
            <select className={inputCls} value={form.credit_account_id} onChange={(e) => setForm({ ...form, credit_account_id: e.target.value })}>
              <option value="">Select account…</option>
              {creditAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
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
          <button onClick={handleSave} disabled={!form.expense_date || !form.account_id || !form.credit_account_id || !form.amount || createMutation.isPending}
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
              placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white"><X size={14} /></button>}
          </div>
          <input type="date" className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          <input type="date" className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          <select className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
            value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
            <option value="">All Accounts</option>
            {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {hasFilters && <button onClick={clearFilters} className="text-sm text-primary-400 hover:text-primary-300 transition-colors">Clear</button>}
        </div>
      </div>

      {/* Hierarchical Expense Table */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex items-center justify-between">
          <h2 className="font-semibold text-white">Expenses by Account</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-400">{filtered.length} records across {tree.length} categories</span>
            {tree.length > 0 && (
              <div className="flex items-center gap-1">
                <button onClick={expandAll} title="Expand all"
                  className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors">
                  <ChevronsUpDown size={14} />
                </button>
                <button onClick={collapseAll} title="Collapse all"
                  className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors">
                  <ChevronsDownUp size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {tree.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <Receipt size={36} className="mx-auto mb-3 text-surface-700" />
            <p>{hasFilters ? "No expenses match your filters" : "No expenses recorded yet"}</p>
          </div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50 border-b border-surface-700">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider w-24">Records</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider w-36">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {tree.map((parent) => (
                  <ParentAccountRow key={parent.account_id} parent={parent} expandedSet={expandedSet} onToggle={toggleExpand} />
                ))}
              </tbody>
              <tfoot className="border-t-2 border-surface-600">
                <tr className="bg-surface-900/30">
                  <td className="px-4 py-3 font-bold text-white">Grand Total</td>
                  <td className="px-4 py-3 text-right text-surface-400 text-xs">{filtered.length}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-400 text-base">{fmt(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden p-3 space-y-3">
            {tree.map((parent) => {
              const parentExpanded = expandedSet.has(parent.account_id);
              const hasChildren = parent.children.length > 0;
              const hasOwnTxns = parent.transactions?.length > 0;
              return (
                <div key={parent.account_id}>
                  <MobileCard onClick={() => toggleExpand(parent.account_id)}>
                    <div className="flex items-center gap-2">
                      {parentExpanded ? <ChevronDown size={14} className="text-surface-400" /> : <ChevronRight size={14} className="text-surface-400" />}
                      <span className="text-white font-medium text-sm">{parent.account_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-surface-400 text-xs">{parent.children.reduce((s, c) => s + c.transactions.length, 0) + (parent.transactions?.length || 0)} records</span>
                      <span className="text-red-400 font-semibold tabular-nums">{fmt(parent.total)}</span>
                    </div>
                  </MobileCard>
                  {parentExpanded && (
                    <div className="ml-3 mt-1.5 space-y-1.5">
                      {hasChildren && parent.children.map((child) => {
                        const childExpanded = expandedSet.has(child.account_id);
                        return (
                          <div key={child.account_id}>
                            <MobileCard onClick={() => toggleExpand(child.account_id)} className="py-3!">
                              <div className="flex items-center gap-2">
                                {childExpanded ? <ChevronDown size={13} className="text-surface-400" /> : <ChevronRight size={13} className="text-surface-400" />}
                                <span className="text-surface-300 text-sm">{child.account_name}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-surface-400 text-xs">{child.transactions.length} records</span>
                                <span className="text-red-400 tabular-nums text-sm">{fmt(child.total)}</span>
                              </div>
                            </MobileCard>
                            {childExpanded && (
                              <div className="ml-3 mt-1 space-y-1">
                                {child.transactions.map((t) => (
                                  <div key={t.id} className="bg-surface-900/40 border border-surface-700/50 rounded-lg px-3 py-2 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-surface-400 text-xs">{new Date(t.txn_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                      <span className="text-red-400 tabular-nums text-xs font-medium">{fmt(t.amount)}</span>
                                    </div>
                                    {t.supplier_name && <div className="text-surface-300 text-xs">{t.supplier_name}</div>}
                                    {t.description && <div className="text-surface-400 text-xs truncate">{t.description}</div>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {hasOwnTxns && !hasChildren && parent.transactions.map((t) => (
                        <div key={t.id} className="bg-surface-900/40 border border-surface-700/50 rounded-lg px-3 py-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-surface-400 text-xs">{new Date(t.txn_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                            <span className="text-red-400 tabular-nums text-xs font-medium">{fmt(t.amount)}</span>
                          </div>
                          {t.supplier_name && <div className="text-surface-300 text-xs">{t.supplier_name}</div>}
                          {t.description && <div className="text-surface-400 text-xs truncate">{t.description}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <MobileCard className="bg-surface-900/30! border-surface-600">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Grand Total</span>
                <span className="font-bold text-red-400 text-base tabular-nums">{fmt(totalAmount)}</span>
              </div>
              <div className="text-surface-400 text-xs">{filtered.length} records</div>
            </MobileCard>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExpensesPage;

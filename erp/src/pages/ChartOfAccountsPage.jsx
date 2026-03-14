import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  updateAccountStatus,
} from "@/services/accounts.service";
import { MobileCard, MobileField } from "@/components/shared/MobileCard";
import { inputCls } from "@/utils/constants";
import { useAccountClasses } from "@/hooks/useAccountClasses";
import {
  BookOpen,
  Building,
  DollarSign,
  Plus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
  Search,
  ToggleRight,
  ToggleLeft,
  Edit2,
  Save,
  X,
  Shield,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  PiggyBank,
  Landmark,
  Banknote,
} from "lucide-react";
import toast from "react-hot-toast";

// Visual styling map — new classes added via Settings get a neutral default
const CLASS_STYLES = {
  asset:                 { icon: Wallet, color: "text-blue-400", bg: "bg-blue-500/10", badge: "bg-blue-500/20 text-blue-300" },
  current_asset:         { icon: Wallet, color: "text-sky-400", bg: "bg-sky-500/10", badge: "bg-sky-500/20 text-sky-300" },
  non_current_asset:     { icon: Landmark, color: "text-indigo-400", bg: "bg-indigo-500/10", badge: "bg-indigo-500/20 text-indigo-300" },
  liability:             { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10", badge: "bg-red-500/20 text-red-300" },
  current_liability:     { icon: TrendingDown, color: "text-pink-400", bg: "bg-pink-500/10", badge: "bg-pink-500/20 text-pink-300" },
  non_current_liability: { icon: TrendingDown, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", badge: "bg-fuchsia-500/20 text-fuchsia-300" },
  equity:                { icon: Building, color: "text-violet-400", bg: "bg-violet-500/10", badge: "bg-violet-500/20 text-violet-300" },
  income:                { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", badge: "bg-emerald-500/20 text-emerald-300" },
  cost_of_sales:         { icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-500/10", badge: "bg-yellow-500/20 text-yellow-300" },
  expense:               { icon: ShoppingCart, color: "text-orange-400", bg: "bg-orange-500/10", badge: "bg-orange-500/20 text-orange-300" },
  admin_cost:            { icon: Shield, color: "text-slate-400", bg: "bg-slate-500/10", badge: "bg-slate-500/20 text-slate-300" },
  operating_cost:        { icon: PiggyBank, color: "text-teal-400", bg: "bg-teal-500/10", badge: "bg-teal-500/20 text-teal-300" },
  finance_cost:          { icon: Landmark, color: "text-rose-400", bg: "bg-rose-500/10", badge: "bg-rose-500/20 text-rose-300" },
  bank:                  { icon: Banknote, color: "text-cyan-400", bg: "bg-cyan-500/10", badge: "bg-cyan-500/20 text-cyan-300" },
};

const DEFAULT_STYLE = { icon: BookOpen, color: "text-surface-400", bg: "bg-surface-500/10", badge: "bg-surface-500/20 text-surface-300" };

const getClassInfo = (cls) => {
  const style = CLASS_STYLES[cls] || DEFAULT_STYLE;
  return { value: cls, label: cls, ...style };
};

const EMPTY_FORM = {
  code: "",
  name: "",
  account_class: "",
  parent_id: "",
  normal_balance: "",
  is_control_account: false,
};

const ChartOfAccountsPage = () => {
  const queryClient = useQueryClient();
  const { data: accountClasses = [] } = useAccountClasses();

  // Build dropdown list from DB lookup, merging in visual styles
  const ACCOUNT_CLASSES = useMemo(
    () =>
      accountClasses
        .filter((c) => c.active)
        .map((c) => ({
          value: c.code,
          label: c.label,
          ...(CLASS_STYLES[c.code] || DEFAULT_STYLE),
        })),
    [accountClasses],
  );

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account added");
      setForm(EMPTY_FORM);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to add account"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setEditingId(null);
      setEditForm({});
      toast.success("Account updated");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to update account"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, active }) => updateAccountStatus(id, active),
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success(active ? "Account activated" : "Account deactivated");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to update status"),
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filterClass, setFilterClass] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortConfig, setSortConfig] = useState({
    key: "code",
    direction: "asc",
  });

  const getParentOptions = (accountClass, excludeId = null) =>
    accounts.filter(
      (a) => a.account_class === accountClass && a.active && a.id !== excludeId,
    );

  const toggleExpand = useCallback((id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleAdd = () => {
    if (!form.code || !form.name || !form.account_class) {
      toast.error("Code, name, and class are required");
      return;
    }
    createMutation.mutate({
      ...form,
      parent_id: form.parent_id || null,
      normal_balance: form.normal_balance || null,
    });
  };

  const handleUpdate = (id) =>
    updateMutation.mutate({
      id,
      payload: { ...editForm, parent_id: editForm.parent_id || null },
    });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  };

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col)
      return <ArrowUpDown size={13} className="text-surface-500" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={13} className="text-primary-400" />
    ) : (
      <ArrowDown size={13} className="text-primary-400" />
    );
  };

  // Hierarchy
  const hierarchy = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, { ...a, children: [] }]));
    const roots = [];
    map.forEach((acc) => {
      if (acc.parent_id && map.has(acc.parent_id))
        map.get(acc.parent_id).children.push(acc);
      else roots.push(acc);
    });
    return roots;
  }, [accounts]);

  const flatten = (nodes, level = 0) => {
    const result = [];
    nodes.forEach((n) => {
      result.push({ ...n, level });
      if (expandedRows.has(n.id) && n.children?.length)
        result.push(...flatten(n.children, level + 1));
    });
    return result;
  };

  const filtered = useMemo(() => {
    return flatten(hierarchy).filter((a) => {
      const matchClass =
        filterClass === "all" || a.account_class === filterClass;
      const matchSearch =
        a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchActive = showInactive || a.active;
      return matchClass && matchSearch && matchActive;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hierarchy, filterClass, searchTerm, showInactive, expandedRows]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = String(a[sortConfig.key] ?? "").toLowerCase();
      const bv = String(b[sortConfig.key] ?? "").toLowerCase();
      return sortConfig.direction === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const selectCls = `${inputCls} cursor-pointer`;

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {ACCOUNT_CLASSES.map((cls) => {
          const Icon = cls.icon;
          const count = accounts.filter(
            (a) => a.account_class === cls.value && a.active,
          ).length;
          return (
            <button
              key={cls.value}
              onClick={() =>
                setFilterClass(filterClass === cls.value ? "all" : cls.value)
              }
              className={`p-3 rounded-xl border transition-all text-left ${filterClass === cls.value ? "border-primary-500 bg-primary-500/10" : "border-surface-700 bg-surface-800/50 hover:border-surface-600"}`}
            >
              <div className={`p-1.5 rounded-lg ${cls.bg} inline-flex mb-2`}>
                <Icon size={14} className={cls.color} />
              </div>
              <div className="text-xl font-bold text-white">{count}</div>
              <div className="text-xs text-surface-400 mt-0.5 truncate">
                {cls.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Add Account Form */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-primary-500/15 rounded-lg">
            <Plus size={16} className="text-primary-400" />
          </div>
          <h2 className="font-semibold text-white">Add New Account</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <input
            className={inputCls}
            placeholder="Code *"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className={selectCls}
            value={form.account_class}
            onChange={(e) =>
              setForm({ ...form, account_class: e.target.value, parent_id: "" })
            }
          >
            <option value="">Class *</option>
            {ACCOUNT_CLASSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            value={form.parent_id}
            onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
            disabled={!form.account_class}
          >
            <option value="">No Parent</option>
            {getParentOptions(form.account_class).map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} – {a.name}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            value={form.normal_balance}
            onChange={(e) =>
              setForm({ ...form, normal_balance: e.target.value })
            }
          >
            <option value="">Normal Balance</option>
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-surface-300">
              <input
                type="checkbox"
                checked={form.is_control_account}
                onChange={(e) =>
                  setForm({ ...form, is_control_account: e.target.checked })
                }
                className="rounded border-surface-600 bg-surface-900 text-primary-500 focus:ring-primary-500"
              />
              Control Acct
            </label>
            <button
              onClick={handleAdd}
              disabled={createMutation.isPending}
              className="ml-auto px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-surface-700 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <input
              className="w-full pl-9 pr-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Search code or name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <select
            className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterClass}
            onChange={(e) => {
              setFilterClass(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Classes</option>
            {ACCOUNT_CLASSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${showInactive ? "bg-primary-500/20 text-primary-300 border border-primary-500/30" : "bg-surface-900 border border-surface-600 text-surface-400 hover:text-white"}`}
          >
            {showInactive ? (
              <ToggleRight size={16} />
            ) : (
              <ToggleLeft size={16} />
            )}{" "}
            Inactive
          </button>
          <div className="ml-auto flex items-center gap-2 text-sm text-surface-400">
            <span>{sorted.length} accounts</span>
            <select
              className="px-2 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={15}>15/page</option>
              <option value={25}>25/page</option>
              <option value={50}>50/page</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-900/50 border-b border-surface-700">
              <tr>
                {[
                  ["code", "Code"],
                  ["name", "Name"],
                  ["account_class", "Class"],
                  ["normal_balance", "Balance"],
                ].map(([key, label]) => (
                  <th key={key} className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort(key)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      {label} <SortIcon col={key} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-surface-400"
                  >
                    <BookOpen
                      size={32}
                      className="mx-auto mb-3 text-surface-600"
                    />
                    <p>No accounts found</p>
                  </td>
                </tr>
              ) : (
                paginated.map((account) => {
                  const isEditing = editingId === account.id;
                  const cls = getClassInfo(account.account_class);
                  const Icon = cls.icon;
                  const hasChildren = account.children?.length > 0;
                  const isExpanded = expandedRows.has(account.id);

                  return (
                    <tr
                      key={account.id}
                      className={`transition-colors ${account.active ? "hover:bg-surface-700/30" : "opacity-50"}`}
                    >
                      {isEditing ? (
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex flex-wrap gap-3 items-center">
                            <input
                              className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-24"
                              value={editForm.code}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  code: e.target.value,
                                })
                              }
                              placeholder="Code"
                            />
                            <input
                              className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 min-w-32"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Name"
                            />
                            <select
                              className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={editForm.account_class}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  account_class: e.target.value,
                                })
                              }
                            >
                              {ACCOUNT_CLASSES.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                            <select
                              className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={editForm.parent_id || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  parent_id: e.target.value,
                                })
                              }
                            >
                              <option value="">No Parent</option>
                              {getParentOptions(
                                editForm.account_class,
                                account.id,
                              ).map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.code} – {a.name}
                                </option>
                              ))}
                            </select>
                            <select
                              className="px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={editForm.normal_balance || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  normal_balance: e.target.value,
                                })
                              }
                            >
                              <option value="">Balance</option>
                              <option value="debit">Debit</option>
                              <option value="credit">Credit</option>
                            </select>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-surface-300 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={editForm.is_control_account || false}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    is_control_account: e.target.checked,
                                  })
                                }
                                className="rounded border-surface-600 bg-surface-900 text-primary-500 focus:ring-primary-500"
                              />
                              Control Acct
                            </label>
                            <div className="ml-auto flex gap-2">
                              <button
                                onClick={() => handleUpdate(account.id)}
                                disabled={updateMutation.isPending}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <Save size={14} /> Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditForm({});
                                }}
                                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white text-sm rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <X size={14} /> Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {hasChildren && (
                                <button
                                  onClick={() => toggleExpand(account.id)}
                                  className="p-0.5 hover:bg-surface-600 rounded"
                                >
                                  {isExpanded ? (
                                    <ChevronDown
                                      size={14}
                                      className="text-surface-400"
                                    />
                                  ) : (
                                    <ChevronRight
                                      size={14}
                                      className="text-surface-400"
                                    />
                                  )}
                                </button>
                              )}
                              <span
                                className="font-mono text-surface-200"
                                style={{
                                  paddingLeft: `${account.level * 1.25}rem`,
                                }}
                              >
                                {account.code}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`p-1 rounded ${cls.bg}`}>
                                <Icon size={13} className={cls.color} />
                              </div>
                              <span className="text-white font-medium">
                                {account.name}
                              </span>
                              {account.is_control_account && (
                                <Shield
                                  size={12}
                                  className="text-yellow-400"
                                  title="Control Account"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls.badge}`}
                            >
                              {cls.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-surface-300 capitalize">
                            {account.normal_balance || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${account.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${account.active ? "bg-emerald-500" : "bg-red-500"}`}
                              />
                              {account.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: account.id,
                                    active: !account.active,
                                  })
                                }
                                className={`p-1.5 rounded-lg transition-colors ${account.active ? "bg-red-500/15 hover:bg-red-500/25 text-red-400" : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400"}`}
                                title={
                                  account.active ? "Deactivate" : "Activate"
                                }
                              >
                                {account.active ? (
                                  <ToggleRight size={15} />
                                ) : (
                                  <ToggleLeft size={15} />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(account.id);
                                  setEditForm({
                                    code: account.code,
                                    name: account.name,
                                    account_class: account.account_class,
                                    parent_id: account.parent_id || "",
                                    normal_balance:
                                      account.normal_balance || "",
                                    is_control_account:
                                      account.is_control_account || false,
                                  });
                                }}
                                className="p-1.5 bg-surface-700/50 hover:bg-surface-700 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={15} className="text-surface-300" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {paginated.length === 0 ? (
            <div className="px-4 py-16 text-center text-surface-400">
              <BookOpen size={32} className="mx-auto mb-3 text-surface-600" />
              <p>No accounts found</p>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {paginated.map((account) => {
                const isEditing = editingId === account.id;
                const cls = getClassInfo(account.account_class);
                const Icon = cls.icon;
                const hasChildren = account.children?.length > 0;

                if (isEditing) {
                  return (
                    <MobileCard key={account.id}>
                      <div className="space-y-3">
                        <input className="w-full px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} placeholder="Code" />
                        <input className="w-full px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name" />
                        <select className="w-full px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none" value={editForm.account_class} onChange={(e) => setEditForm({ ...editForm, account_class: e.target.value })}>
                          {ACCOUNT_CLASSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdate(account.id)} disabled={updateMutation.isPending} className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg flex items-center justify-center gap-1"><Save size={14} /> Save</button>
                          <button onClick={() => { setEditingId(null); setEditForm({}); }} className="flex-1 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white text-sm rounded-lg flex items-center justify-center gap-1"><X size={14} /> Cancel</button>
                        </div>
                      </div>
                    </MobileCard>
                  );
                }

                return (
                  <MobileCard key={account.id} className={!account.active ? "opacity-50" : ""}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {hasChildren && (
                          <button onClick={() => toggleExpand(account.id)} className="p-0.5 hover:bg-surface-600 rounded">
                            {expandedRows.has(account.id) ? <ChevronDown size={14} className="text-surface-400" /> : <ChevronRight size={14} className="text-surface-400" />}
                          </button>
                        )}
                        <div className={`p-1 rounded ${cls.bg}`}><Icon size={13} className={cls.color} /></div>
                        <div style={{ paddingLeft: `${account.level * 0.75}rem` }}>
                          <span className="font-mono text-xs text-surface-400">{account.code}</span>
                          <span className="text-white font-medium text-sm ml-2">{account.name}</span>
                          {account.is_control_account && <Shield size={12} className="text-yellow-400 inline ml-1" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls.badge}`}>{cls.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${account.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${account.active ? "bg-emerald-500" : "bg-red-500"}`} />
                          {account.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-surface-300 capitalize text-xs">{account.normal_balance || "—"}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => statusMutation.mutate({ id: account.id, active: !account.active })} className={`p-1.5 rounded-lg transition-colors ${account.active ? "bg-red-500/15 hover:bg-red-500/25 text-red-400" : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400"}`}>
                          {account.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                        </button>
                        <button onClick={() => { setEditingId(account.id); setEditForm({ code: account.code, name: account.name, account_class: account.account_class, parent_id: account.parent_id || "", normal_balance: account.normal_balance || "", is_control_account: account.is_control_account || false }); }} className="p-1.5 bg-surface-700/50 hover:bg-surface-700 rounded-lg transition-colors">
                          <Edit2 size={15} className="text-surface-300" />
                        </button>
                      </div>
                    </div>
                  </MobileCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-700 flex items-center justify-between text-sm">
            <span className="text-surface-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-surface-700/50 hover:bg-surface-700 disabled:opacity-40 text-white rounded-lg transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p =
                  totalPages <= 5
                    ? i + 1
                    : currentPage <= 3
                      ? i + 1
                      : currentPage >= totalPages - 2
                        ? totalPages - 4 + i
                        : currentPage - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === p ? "bg-primary-600 text-white" : "bg-surface-700/50 hover:bg-surface-700 text-surface-300"}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-surface-700/50 hover:bg-surface-700 disabled:opacity-40 text-white rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartOfAccountsPage;

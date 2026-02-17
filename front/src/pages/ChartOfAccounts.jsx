import { useState, useMemo } from "react";
import { useAccounts } from "../hooks/useAccounts";
import {
  BookOpen,
  Building,
  DollarSign,
  Plus,
  Filter,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
  Search,
  ToggleRight,
  ToggleLeft,
  Edit2,
  Check,
  Save,
  X,
  GitBranch,
  Shield,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import toast from "react-hot-toast";

const ChartOfAccounts = () => {
  const {
    accounts,
    addAccount,
    isLoading,
    reload,
    editAccount,
    deactivateAccount,
  } = useAccounts();

  const [form, setForm] = useState({
    code: "",
    name: "",
    account_class: "",
    parent_id: "",
    normal_balance: "",
    is_control_account: false,
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "code",
    direction: "asc",
  });

  const accountClasses = [
    {
      value: "asset",
      label: "Asset",
      icon: Wallet,
      color: "from-blue-500 to-cyan-500",
    },
    {
      value: "liability",
      label: "Liability",
      icon: TrendingDown,
      color: "from-red-500 to-orange-500",
    },
    {
      value: "equity",
      label: "Equity",
      icon: Building,
      color: "from-purple-500 to-pink-500",
    },
    {
      value: "income",
      label: "Income",
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
    },
    {
      value: "expense",
      label: "Expense",
      icon: ShoppingCart,
      color: "from-pink-500 to-purple-500",
    },
    {
      value: "cost_of_sales",
      label: "Cost of Sales",
      icon: ShoppingCart,
      color: "from-orange-500 to-red-500",
    },
  ];

  const getTypeInfo = (accountClass) => {
    return (
      accountClasses.find((t) => t.value === accountClass) || accountClasses[0]
    );
  };

  const getParentOptions = (accountClass, currentAccountId = null) => {
    return accounts.filter(
      (acc) =>
        acc.account_class === accountClass &&
        acc.active &&
        acc.id !== currentAccountId
    );
  };

  const toggleRowExpansion = (accountId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedRows(newExpanded);
  };

  const startEdit = (account) => {
    setEditingId(account.id);
    setEditForm({
      code: account.code,
      name: account.name,
      account_class: account.account_class,
      parent_id: account.parent_id || "",
      normal_balance: account.normal_balance || "",
      is_control_account: account.is_control_account || false,
      active: account.active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleUpdate = async (id) => {
    try {
      await editAccount(id, editForm);
      toast.success("Account updated successfully");
      reload();
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      toast.error(error.message || "Failed to update account");
    }
  };

  const toggleActive = async (account) => {
    try {
      const response = await deactivateAccount(account.id, {
        active: !account.active,
      });
      if (response)
        toast.success(
          `Account ${!account.active ? "activated" : "deactivated"}`
        );
      reload();
    } catch (error) {
      toast.error(error.message || "Failed to update account status");
    }
  };

  const handleAdd = async () => {
    if (!form.code || !form.name || !form.account_class) {
      toast.error("Code, name, and account class are required");
      return;
    }

    try {
      const payload = {
        code: form.code,
        name: form.name,
        account_class: form.account_class,
        parent_id: form.parent_id || null,
        normal_balance: form.normal_balance || null,
        is_control_account: form.is_control_account,
      };

      const response = await addAccount(payload);
      if (response) toast.success("Account added successfully");
      reload();
      setForm({
        code: "",
        name: "",
        account_class: "",
        parent_id: "",
        normal_balance: "",
        is_control_account: false,
      });
    } catch (error) {
      toast.error(error.message || "Failed to add account");
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="text-gray-500" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={14} className="text-pink-500" />
    ) : (
      <ArrowDown size={14} className="text-pink-500" />
    );
  };

  // Build hierarchical structure
  const accountHierarchy = useMemo(() => {
    const hierarchy = [];
    const accountMap = new Map();

    // Create map of all accounts
    accounts.forEach((account) => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    // Build hierarchy
    accountMap.forEach((account) => {
      if (account.parent_id) {
        const parent = accountMap.get(account.parent_id);
        if (parent) {
          parent.children.push(account);
        } else {
          hierarchy.push(account);
        }
      } else {
        hierarchy.push(account);
      }
    });

    return hierarchy;
  }, [accounts]);

  // Flatten hierarchy for display with indentation info
  const flattenHierarchy = (hierarchy, level = 0) => {
    const flattened = [];
    hierarchy.forEach((account) => {
      flattened.push({ ...account, level });
      if (
        expandedRows.has(account.id) &&
        account.children &&
        account.children.length > 0
      ) {
        flattened.push(...flattenHierarchy(account.children, level + 1));
      }
    });
    return flattened;
  };

  // Filter and search
  const filteredAccounts = useMemo(() => {
    return flattenHierarchy(accountHierarchy).filter((account) => {
      const matchesType =
        filterType === "all" || account.account_class === filterType;
      const matchesSearch =
        account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesActive = showInactive || account.active;
      return matchesType && matchesSearch && matchesActive;
    });
  }, [accountHierarchy, filterType, searchTerm, showInactive, expandedRows]);

  // Sort accounts
  const sortedAccounts = useMemo(() => {
    const sorted = [...filteredAccounts];
    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue == null) aValue = "";
      if (bValue == null) bValue = "";

      // Convert to string for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [filteredAccounts, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedAccounts.length / itemsPerPage);
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAccounts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAccounts, currentPage, itemsPerPage]);

  // Group accounts by class for statistics
  const accountStats = accountClasses.map((type) => ({
    ...type,
    count: accounts.filter(
      (a) => a.account_class === type.value && a.active
    ).length,
  }));

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Chart of Accounts
            </h1>
            <p className="text-gray-400 mt-1 text-sm md:text-base">
              Manage your accounting structure
            </p>
          </div>

          {/* Stats Summary */}
          <div className="bg-linear-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <BookOpen size={16} />
              <span>Total Accounts</span>
            </div>
            <div className="text-2xl font-bold text-pink-500">
              {accounts.filter((a) => a.active).length}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {accountStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.value}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 hover:border-gray-600 transition-colors"
              >
                <div
                  className={`inline-flex p-2 bg-linear-to-br ${stat.color} bg-opacity-10 rounded-lg mb-2`}
                >
                  <Icon size={16} className="text-white" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {stat.count}
                </div>
                <div className="text-xs text-gray-400 mt-1 truncate">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Account Form Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 md:p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-linear-to-br from-pink-500 to-purple-500 rounded-lg">
              <Plus size={20} className="text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-white">
              Add New Account
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Account Code */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <BookOpen size={16} className="text-pink-500" />
                Account Code *
              </label>
              <input
                type="text"
                placeholder="e.g., 1000"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Account Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <BookOpen size={16} className="text-purple-500" />
                Account Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Cash on Hand"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Account Class */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Filter size={16} className="text-pink-500" />
                Account Class *
              </label>
              <select
                value={form.account_class}
                onChange={(e) =>
                  setForm({ ...form, account_class: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              >
                <option value="">Select Class</option>
                {accountClasses.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Parent Account */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <GitBranch size={16} className="text-blue-500" />
                Parent Account
              </label>
              <select
                value={form.parent_id}
                onChange={(e) =>
                  setForm({ ...form, parent_id: e.target.value })
                }
                disabled={!form.account_class}
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">None (Top Level)</option>
                {form.account_class &&
                  getParentOptions(form.account_class).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Normal Balance */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <DollarSign size={16} className="text-green-500" />
                Normal Balance
              </label>
              <select
                value={form.normal_balance}
                onChange={(e) =>
                  setForm({ ...form, normal_balance: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="">Select Balance</option>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            {/* Control Account Checkbox */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Shield size={16} className="text-yellow-500" />
                Control Account
              </label>
              <div className="flex items-center h-[42px]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_control_account}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        is_control_account: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded border-gray-600 bg-gray-900/50 text-pink-500 focus:ring-2 focus:ring-pink-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-400">
                    Is Control Account
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleAdd}
              className="px-6 py-3 bg-linear-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-semibold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all duration-200 flex items-center gap-2"
            >
              <Plus size={18} />
              Add Account
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all md:w-64"
            >
              <option value="all">All Classes</option>
              {accountClasses.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* Show Inactive Toggle */}
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                showInactive
                  ? "bg-linear-to-r from-pink-500 to-purple-500 text-white"
                  : "bg-gray-900/50 border border-gray-600 text-gray-300 hover:bg-gray-900"
              }`}
            >
              {showInactive ? (
                <ToggleRight size={18} />
              ) : (
                <ToggleLeft size={18} />
              )}
              <span className="hidden sm:inline">Show Inactive</span>
            </button>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 md:p-6 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold text-white">
                Accounts
              </h2>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400">
                  {sortedAccounts.length}{" "}
                  {sortedAccounts.length === 1 ? "account" : "accounts"}
                </div>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/30 border-b border-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("code")}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      Code {getSortIcon("code")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      Name {getSortIcon("name")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("account_class")}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      Class {getSortIcon("account_class")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("normal_balance")}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      Balance {getSortIcon("normal_balance")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {paginatedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700/50 rounded-full mb-4">
                        <BookOpen size={32} className="text-gray-500" />
                      </div>
                      <p className="text-gray-400">No accounts found</p>
                      <p className="text-gray-500 text-sm mt-1">
                        {searchTerm || filterType !== "all"
                          ? "Try adjusting your search or filter"
                          : "Add your first account to get started"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedAccounts.map((account) => {
                    const isEditing = editingId === account.id;
                    const typeInfo = getTypeInfo(account.account_class);
                    const Icon = typeInfo.icon;
                    const hasChildren =
                      account.children && account.children.length > 0;
                    const isExpanded = expandedRows.has(account.id);

                    return (
                      <tr
                        key={account.id}
                        className={`transition-colors ${
                          account.active
                            ? "hover:bg-gray-700/30"
                            : "bg-gray-700/20 opacity-60"
                        }`}
                      >
                        {isEditing ? (
                          // Edit Mode - spans all columns
                          <td colSpan={6} className="px-4 py-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <input
                                  type="text"
                                  value={editForm.code}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      code: e.target.value,
                                    })
                                  }
                                  placeholder="Code"
                                  className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                                />
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      name: e.target.value,
                                    })
                                  }
                                  placeholder="Name"
                                  className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                />
                                <select
                                  value={editForm.account_class}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      account_class: e.target.value,
                                    })
                                  }
                                  className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                                >
                                  {accountClasses.map((type) => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={editForm.normal_balance || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      normal_balance: e.target.value,
                                    })
                                  }
                                  className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                >
                                  <option value="">Balance</option>
                                  <option value="debit">Debit</option>
                                  <option value="credit">Credit</option>
                                </select>
                              </div>

                              <div className="flex flex-wrap items-center gap-4">
                                <select
                                  value={editForm.parent_id || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      parent_id: e.target.value,
                                    })
                                  }
                                  className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                  <option value="">No Parent</option>
                                  {getParentOptions(
                                    editForm.account_class,
                                    account.id
                                  ).map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                      {acc.code} - {acc.name}
                                    </option>
                                  ))}
                                </select>

                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editForm.is_control_account || false}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        is_control_account: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-900/50 text-pink-500 focus:ring-2 focus:ring-pink-500"
                                  />
                                  <span className="text-sm text-gray-300">
                                    Control Account
                                  </span>
                                </label>

                                <button
                                  onClick={() =>
                                    setEditForm({
                                      ...editForm,
                                      active: !editForm.active,
                                    })
                                  }
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    editForm.active
                                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                                  }`}
                                >
                                  {editForm.active ? (
                                    <Check size={16} />
                                  ) : (
                                    <X size={16} />
                                  )}
                                  {editForm.active ? "Active" : "Inactive"}
                                </button>

                                <div className="ml-auto flex gap-2">
                                  <button
                                    onClick={() => handleUpdate(account.id)}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors"
                                  >
                                    <Save size={16} />
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors"
                                  >
                                    <X size={16} />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        ) : (
                          // View Mode
                          <>
                            {/* Code Column */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {hasChildren && (
                                  <button
                                    onClick={() =>
                                      toggleRowExpansion(account.id)
                                    }
                                    className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown size={16} className="text-gray-400" />
                                    ) : (
                                      <ChevronRight size={16} className="text-gray-400" />
                                    )}
                                  </button>
                                )}
                                <span
                                  style={{
                                    paddingLeft: `${account.level * 1.5}rem`,
                                  }}
                                  className="font-mono text-sm text-white"
                                >
                                  {account.code}
                                </span>
                              </div>
                            </td>

                            {/* Name Column */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`p-1.5 rounded-lg bg-linear-to-br ${typeInfo.color} bg-opacity-10`}
                                >
                                  <Icon size={14} className="text-white" />
                                </div>
                                <span className="text-sm text-white font-medium">
                                  {account.name}
                                </span>
                              </div>
                            </td>

                            {/* Class Column */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-linear-to-r ${typeInfo.color} bg-opacity-20 text-white border border-opacity-30`}
                                >
                                  {typeInfo.label}
                                </span>
                                {account.is_control_account && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                    <Shield size={10} />
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Balance Column */}
                            <td className="px-4 py-3">
                              {account.normal_balance && (
                                <span className="text-sm text-gray-300 capitalize">
                                  {account.normal_balance}
                                </span>
                              )}
                            </td>

                            {/* Status Column */}
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  account.active
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    account.active
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                  }`}
                                ></div>
                                {account.active ? "Active" : "Inactive"}
                              </span>
                            </td>

                            {/* Actions Column */}
                            <td className="px-4 py-3">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => toggleActive(account)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    account.active
                                      ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                                      : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                                  }`}
                                  title={
                                    account.active ? "Deactivate" : "Activate"
                                  }
                                >
                                  {account.active ? (
                                    <ToggleRight size={16} />
                                  ) : (
                                    <ToggleLeft size={16} />
                                  )}
                                </button>
                                <button
                                  onClick={() => startEdit(account)}
                                  className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 size={16} className="text-gray-300" />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-700/50 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="text-gray-300" />
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? "bg-linear-to-r from-pink-500 to-purple-500 text-white"
                            : "bg-gray-700/50 hover:bg-gray-700 text-gray-300"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRightIcon size={16} className="text-gray-300" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartOfAccounts;

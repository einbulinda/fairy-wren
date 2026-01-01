import { useState } from "react";
import { useAccounts } from "../../hooks/useAccounts";
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
} from "lucide-react";
import LoadingSpinner from "../shared/LoadingSpinner";
import toast from "react-hot-toast";

const AccountsManagement = () => {
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
    type: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const accountTypes = [
    {
      value: "asset",
      label: "Asset",
      icon: Wallet,
      color: "from-blue-500 to-cyan-500",
    },
    {
      value: "current_asset",
      label: "Current Asset",
      icon: DollarSign,
      color: "from-blue-400 to-cyan-400",
    },
    {
      value: "liability",
      label: "Liability",
      icon: TrendingDown,
      color: "from-red-500 to-orange-500",
    },
    {
      value: "current_liability",
      label: "Current Liability",
      icon: TrendingDown,
      color: "from-red-400 to-orange-400",
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

  const getTypeInfo = (type) => {
    return accountTypes.find((t) => t.value === type) || accountTypes[0];
  };

  const startEdit = (account) => {
    setEditingId(account.id);
    setEditForm({
      code: account.code,
      name: account.name,
      type: account.type,
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
    if (!form.code || !form.name || !form.type) {
      toast.error("All fields are required");
      return;
    }

    try {
      const response = await addAccount(form);
      if (response) toast.success("Account added successfully");
      reload();
      setForm({ code: "", name: "", type: "" });
    } catch (error) {
      toast.error(error.message || "Failed to add account");
    }
  };

  // Filter and search logic
  const filteredAccounts = accounts.filter((account) => {
    const matchesType = filterType === "all" || account.type === filterType;
    const matchesSearch =
      account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = showInactive || account.active;
    return matchesType && matchesSearch && matchesActive;
  });

  // Group accounts by type for statistics
  const accountStats = accountTypes.map((type) => ({
    ...type,
    count: accounts.filter((a) => a.type === type.value && a.active).length,
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Account Type */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Filter size={16} className="text-pink-500" />
                Account Type *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              >
                <option value="">Select Type</option>
                {accountTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
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
              <option value="all">All Types</option>
              {accountTypes.map((type) => (
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

        {/* Accounts List */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 md:p-6 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold text-white">
                Accounts
              </h2>
              <div className="text-sm text-gray-400">
                {filteredAccounts.length}{" "}
                {filteredAccounts.length === 1 ? "account" : "accounts"}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-700/50">
            {filteredAccounts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700/50 rounded-full mb-4">
                  <BookOpen size={32} className="text-gray-500" />
                </div>
                <p className="text-gray-400">No accounts found</p>
                <p className="text-gray-500 text-sm mt-1">
                  {searchTerm || filterType !== "all"
                    ? "Try adjusting your search or filter"
                    : "Add your first account to get started"}
                </p>
              </div>
            ) : (
              filteredAccounts.map((account) => {
                const isEditing = editingId === account.id;
                const typeInfo = getTypeInfo(account.type);
                const Icon = typeInfo.icon;

                return (
                  <div
                    key={account.id}
                    className={`p-4 md:p-5 transition-colors duration-150 ${
                      account.active
                        ? "hover:bg-gray-700/30"
                        : "bg-gray-700/20 opacity-60"
                    }`}
                  >
                    {isEditing ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <input
                            type="text"
                            value={editForm.code}
                            onChange={(e) =>
                              setEditForm({ ...editForm, code: e.target.value })
                            }
                            placeholder="Code"
                            className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          />
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            placeholder="Name"
                            className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:col-span-1"
                          />
                          <select
                            value={editForm.type}
                            onChange={(e) =>
                              setEditForm({ ...editForm, type: e.target.value })
                            }
                            className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          >
                            {accountTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Active Toggle in Edit Mode */}
                        <div className="flex items-center gap-3">
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
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                          <button
                            onClick={() => handleUpdate(account.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors"
                          >
                            <Save size={16} />
                            Save Changes
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
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                          {/* Icon */}
                          <div
                            className={`p-2 md:p-3 bg-linear-to-br ${typeInfo.color} bg-opacity-10 border border-opacity-30 rounded-xl shrink-0`}
                          >
                            <Icon size={20} className="text-white" />
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                              <h3 className="font-semibold text-white text-base md:text-lg truncate">
                                {account.name}
                              </h3>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-linear-to-r ${typeInfo.color} bg-opacity-20 text-white border border-opacity-30 w-fit`}
                              >
                                {typeInfo.label}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                              <span className="font-mono bg-gray-700/50 px-2 py-0.5 rounded">
                                {account.code}
                              </span>
                              <span
                                className={`flex items-center gap-1 ${
                                  account.active
                                    ? "text-green-500"
                                    : "text-red-500"
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
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => toggleActive(account)}
                            className={`p-2 md:p-2.5 rounded-lg transition-colors ${
                              account.active
                                ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                                : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                            }`}
                            title={account.active ? "Deactivate" : "Activate"}
                          >
                            {account.active ? (
                              <ToggleRight size={16} />
                            ) : (
                              <ToggleLeft size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => startEdit(account)}
                            className="p-2 md:p-2.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} className="text-gray-300" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsManagement;

import { useState } from "react";
import { useExpenses } from "../../hooks/useExpenses";
import { useSuppliers } from "../../hooks/useSuppliers";
import { useAccounts } from "../../hooks/useAccounts";
import LoadingSpinner from "../shared/LoadingSpinner";
import toast from "react-hot-toast";
import {
  Plus,
  Calendar,
  DollarSign,
  FileText,
  Building2,
  Receipt,
  TrendingDown,
} from "lucide-react";

const ExpenseManagement = () => {
  const { expenses, addExpense, reload, isLoading } = useExpenses();
  const { suppliers, isLoading: supplierLoading } = useSuppliers();
  const { accounts, isLoading: accountsLoading } = useAccounts();

  const [form, setForm] = useState({
    expense_date: "",
    supplier_id: "",
    account_id: "",
    amount: "",
    invoice_number: "",
    description: "",
  });

  const handleSave = async () => {
    if (!form.expense_date || !form.account_id || !form.amount) {
      toast.error("Date, account and amount are required");
      return;
    }

    try {
      const response = await addExpense({
        ...form,
        amount: parseFloat(form.amount),
      });

      if (response) toast.success("Expense recorded");

      reload();

      setForm({
        expense_date: "",
        supplier_id: "",
        account_id: "",
        amount: "",
        invoice_number: "",
        description: "",
      });
    } catch {
      toast.error("Failed to save expense");
    }
  };

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (isLoading || supplierLoading || accountsLoading)
    return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Expense Management
            </h1>
            <p className="text-gray-400 mt-1">
              Track and manage your business expenses
            </p>
          </div>

          {/* Stats Card */}
          <div className="bg-linear-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl p-4 min-w-[200px]">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <TrendingDown size={16} />
              <span>Total Expenses</span>
            </div>
            <div className="text-2xl font-bold text-pink-500">
              KES {totalExpenses.toLocaleString()}
            </div>
          </div>
        </div>
        {/* Add Expense Form Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-linear-to-br from-pink-500 to-purple-500 rounded-lg">
              <Plus size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Add New Expense
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Calendar size={16} className="text-pink-500" />
                Expense Date
              </label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) =>
                  setForm({ ...form, expense_date: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Account Select */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <FileText size={16} className="text-purple-500" />
                Expense Account *
              </label>
              <select
                value={form.account_id}
                onChange={(e) =>
                  setForm({ ...form, account_id: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="">Select Account</option>
                {accounts
                  .filter((a) => a.type === "expense")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} – {a.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <DollarSign size={16} className="text-pink-500" />
                Amount *
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Supplier Select */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Building2 size={16} className="text-purple-500" />
                Supplier
              </label>
              <select
                value={form.supplier_id}
                onChange={(e) =>
                  setForm({ ...form, supplier_id: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="">Select Supplier (optional)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Number */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Receipt size={16} className="text-pink-500" />
                Invoice Number
              </label>
              <input
                placeholder="INV-001"
                value={form.invoice_number}
                onChange={(e) =>
                  setForm({ ...form, invoice_number: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <FileText size={16} className="text-purple-500" />
                Description
              </label>
              <textarea
                placeholder="Brief description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-linear-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-semibold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all duration-200 flex items-center gap-2"
            >
              <Plus size={18} />
              Add Expense
            </button>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Recent Expenses
              </h2>
              <div className="text-sm text-gray-400">
                {expenses.length}{" "}
                {expenses.length === 1 ? "expense" : "expenses"}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-700/50">
            {expenses.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700/50 rounded-full mb-4">
                  <Receipt size={32} className="text-gray-500" />
                </div>
                <p className="text-gray-400">No expenses recorded yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  Add your first expense to get started
                </p>
              </div>
            ) : (
              expenses.map((e) => (
                <div
                  key={e.id}
                  className="p-5 hover:bg-gray-700/30 transition-colors duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Icon */}
                      <div className="p-3 bg-linear-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl">
                        <Receipt size={20} className="text-pink-500" />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-lg mb-1">
                          {e.chart_of_accounts.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={14} />
                            <span>{e.suppliers?.name || "No supplier"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            <span>
                              {new Date(e.expense_date).toLocaleDateString()}
                            </span>
                          </div>
                          {e.invoice_number && (
                            <div className="flex items-center gap-1.5">
                              <Receipt size={14} />
                              <span>{e.invoice_number}</span>
                            </div>
                          )}
                        </div>
                        {e.description && (
                          <p className="text-gray-500 text-sm mt-2">
                            {e.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        KES {e.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseManagement;

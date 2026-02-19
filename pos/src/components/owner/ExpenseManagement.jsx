import { useMemo, useState } from "react";
import { useExpenses } from "../../hooks/useExpenses";
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
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

const ITEMS_PER_PAGE = 10;

const ExpenseManagement = () => {
  const { expenses, addExpense, reload, isLoading } = useExpenses();

  const [form, setForm] = useState({
    expense_date: "",
    amount: "",
    invoice_number: "",
    description: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const filteredExpenses = useMemo(() => {
    let result = expenses;

    if (searchQuery.trim()) {
      result = result.filter(
        (expense) =>
          expense.chart_of_accounts?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.suppliers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterDateFrom) {
      result = result.filter((expense) => new Date(expense.expense_date) >= new Date(filterDateFrom));
    }
    if (filterDateTo) {
      result = result.filter((expense) => new Date(expense.expense_date) <= new Date(filterDateTo));
    }
    return result;
  }, [searchQuery, expenses, filterDateFrom, filterDateTo]);

  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredExpenses, currentPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || filterDateFrom || filterDateTo;

  const handleSave = async () => {
    if (!form.expense_date || !form.amount) {
      toast.error("Date and amount are required");
      return;
    }

    try {
      const response = await addExpense({ ...form, amount: parseFloat(form.amount) });
      if (response) toast.success("Expense recorded");
      reload();
      setForm({ expense_date: "", amount: "", invoice_number: "", description: "" });
    } catch {
      toast.error("Failed to save expense");
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Expense Management
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Track and manage your business expenses
          </p>
        </div>
        <div className="bg-linear-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl p-3 sm:p-4 min-w-[180px] sm:min-w-[200px]">
          <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm mb-1">
            <TrendingDown size={16} />
            <span>Total Expenses</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-pink-500">
            KSh. {totalExpenses.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Add Expense Form */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <div className="p-2 bg-linear-to-br from-pink-500 to-purple-500 rounded-lg">
            <Plus size={18} className="sm:w-5 sm:h-5 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">Add New Expense</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-300">
              <Calendar size={16} className="text-pink-500" />
              Expense Date <span className="text-pink-500">*</span>
            </label>
            <input type="date" value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-300">
              <DollarSign size={16} className="text-pink-500" />
              Amount <span className="text-pink-500">*</span>
            </label>
            <input type="number" inputMode="decimal" placeholder="0.00" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-300">
              <Receipt size={16} className="text-pink-500" />
              Invoice Number
            </label>
            <input placeholder="INV-001" value={form.invoice_number}
              onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-300">
              <FileText size={16} className="text-purple-500" />
              Description
            </label>
            <textarea placeholder="Brief description" rows="1" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none" />
          </div>
        </div>

        <div className="mt-4 sm:mt-6 flex justify-end">
          <button onClick={handleSave} disabled={!form.expense_date || !form.amount}
            className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-linear-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold text-white text-sm sm:text-base shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95">
            <Plus size={18} /> Add Expense
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Search expenses..." value={searchQuery} onChange={handleSearchChange}
          className="w-full pl-10 pr-10 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-500 placeholder-gray-500" />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <FileText size={18} className="text-pink-500" /> Filters
          </h3>
          {hasActiveFilters && (
            <button onClick={clearAllFilters}
              className="text-xs sm:text-sm text-pink-500 hover:text-pink-400 font-medium transition-colors">
              Clear All
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-300">
              <Calendar size={14} className="text-purple-500" /> From Date
            </label>
            <input type="date" value={filterDateFrom}
              onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-300">
              <Calendar size={14} className="text-purple-500" /> To Date
            </label>
            <input type="date" value={filterDateTo}
              onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-gray-700 text-xs sm:text-sm text-gray-400">
            Showing {filteredExpenses.length} of {expenses.length} expenses
            {filterDateFrom && ` • From ${new Date(filterDateFrom).toLocaleDateString()}`}
            {filterDateTo && ` • To ${new Date(filterDateTo).toLocaleDateString()}`}
          </div>
        )}
      </div>

      {/* Expenses List */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-gray-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-semibold text-white">Recent Expenses</h2>
          <div className="text-xs sm:text-sm text-gray-400">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? "expense" : "expenses"}
          </div>
        </div>

        <div className="divide-y divide-gray-700/50">
          {filteredExpenses.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-700/50 rounded-full mb-4">
                <Receipt size={24} className="sm:w-8 sm:h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm sm:text-base">
                {searchQuery ? "No expenses found" : "No expenses recorded yet"}
              </p>
            </div>
          ) : (
            paginatedExpenses.map((e) => (
              <div key={e.id} className="p-4 sm:p-5 hover:bg-gray-700/30 transition-colors duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="p-2 sm:p-3 bg-linear-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-lg sm:rounded-xl shrink-0">
                      <Receipt size={18} className="sm:w-5 sm:h-5 text-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-base sm:text-lg mb-1 truncate">
                        {e.chart_of_accounts?.name || e.description || "Expense"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={14} />
                          <span className="truncate">{e.suppliers?.name || "No supplier"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          <span>{new Date(e.expense_date).toLocaleDateString()}</span>
                        </div>
                        {e.invoice_number && (
                          <div className="flex items-center gap-1.5">
                            <Receipt size={14} />
                            <span>{e.invoice_number}</span>
                          </div>
                        )}
                      </div>
                      {e.description && (
                        <p className="text-gray-500 text-xs sm:text-sm mt-2 line-clamp-2">{e.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right sm:ml-4 self-end sm:self-auto">
                    <div className="text-xl sm:text-2xl font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                      KSh. {e.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {filteredExpenses.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700">
          <div className="text-xs sm:text-sm text-gray-400">
            Page {currentPage} of {totalPages} ({filteredExpenses.length} total expenses)
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1 text-sm">
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-all text-sm sm:text-base ${currentPage === p ? "bg-linear-to-r from-pink-500 to-purple-500 text-white font-bold" : "bg-gray-700 hover:bg-gray-600 text-gray-300"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1 text-sm">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;

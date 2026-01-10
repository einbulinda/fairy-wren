import { useState, useMemo } from "react";
import {
  Search,
  X,
  Receipt,
  Copy,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
} from "lucide-react";
import { calculateBillTotals } from "../../utils/calculations";
import toast from "react-hot-toast";

const AllBillsView = ({ bills }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const BILLS_PER_PAGE = 10;

  // Filter bills based on search, status, and date range
  const filteredBills = useMemo(() => {
    let filtered = bills;

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter((bill) =>
        bill.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((bill) => bill.status === statusFilter);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(
        (bill) => new Date(bill.created_at) >= new Date(startDate)
      );
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (bill) => new Date(bill.created_at) <= endOfDay
      );
    }

    return filtered;
  }, [bills, searchTerm, statusFilter, startDate, endDate]);

  // Pagination
  const totalPages = Math.ceil(filteredBills.length / BILLS_PER_PAGE);
  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * BILLS_PER_PAGE;
    const endIndex = startIndex + BILLS_PER_PAGE;
    return filteredBills.slice(startIndex, endIndex);
  }, [filteredBills, currentPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const copyBillId = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const toggleBillExpansion = (billId) => {
    setExpandedBillId(expandedBillId === billId ? null : billId);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm || statusFilter !== "all" || startDate || endDate;

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "awaiting_confirmation":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "open":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "awaiting_confirmation":
        return "Pending";
      case "completed":
        return "Completed";
      case "open":
        return "Open";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="bg-gray-900/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handleFilterChange();
            }}
            className="w-full pl-10 pr-10 py-3 rounded-lg bg-gray-900/40 backdrop-blur-md border border-purple-500/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                handleFilterChange();
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Status Filter */}
          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 pointer-events-none"
              size={16}
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900/40 backdrop-blur-md border border-purple-500/20 text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="awaiting_confirmation">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="relative">
            <Calendar
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 pointer-events-none"
              size={16}
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                handleFilterChange();
              }}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900/40 backdrop-blur-md border border-purple-500/20 text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
              placeholder="Start Date"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 pointer-events-none"
              size={16}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                handleFilterChange();
              }}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900/40 backdrop-blur-md border border-purple-500/20 text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
              placeholder="End Date"
            />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-4 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              <X size={16} />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-gray-400 px-1">
        <span>
          Showing{" "}
          {paginatedBills.length > 0
            ? (currentPage - 1) * BILLS_PER_PAGE + 1
            : 0}{" "}
          - {Math.min(currentPage * BILLS_PER_PAGE, filteredBills.length)} of{" "}
          {filteredBills.length} {filteredBills.length === 1 ? "bill" : "bills"}
        </span>
        {hasActiveFilters && (
          <span className="text-purple-400">
            {filteredBills.length} of {bills.length} total bills
          </span>
        )}
      </div>

      {/* Bills Grid */}
      <div className="grid gap-4">
        {paginatedBills.map((bill, index) => {
          const totals = calculateBillTotals(bill);
          const isEvenRow = index % 2 === 0;
          const isExpanded = expandedBillId === bill.id;

          return (
            <div
              key={bill.id}
              className={`
                bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10
                transition-all duration-200
                hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10
                ${isEvenRow ? "bg-gray-900/30" : ""}
              `}
            >
              {/* Main Bill Card - Clickable */}
              <div
                onClick={() => toggleBillExpansion(bill.id)}
                className="p-5 cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-purple-500/20 border border-purple-500/30 shrink-0">
                        <Receipt className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-white truncate">
                            {bill.customer_name}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyBillId(bill.id);
                            }}
                            className="p-1 rounded hover:bg-purple-500/20 transition-colors shrink-0"
                            title="Copy Bill ID"
                          >
                            <Copy size={14} className="text-purple-400" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp
                              size={20}
                              className="text-purple-400 ml-auto"
                            />
                          ) : (
                            <ChevronDown
                              size={20}
                              className="text-purple-400 ml-auto"
                            />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-400">
                            Served By:{" "}
                            <span className="text-white font-medium">
                              {bill.created_by_user?.name || "Unknown"}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(bill.created_at).toLocaleDateString()} at{" "}
                            {new Date(bill.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-sm text-gray-400">
                            {bill.rounds?.length || 0} round
                            {bill.rounds?.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3">
                    <div
                      className={`px-3 py-1.5 rounded-lg border font-semibold text-sm ${getStatusColor(
                        bill.status
                      )}`}
                    >
                      {getStatusLabel(bill.status)}
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        KSh {totals.total.toLocaleString()}
                      </div>
                      {bill.payment_method && (
                        <div className="text-sm text-gray-400 uppercase mt-1">
                          {bill.payment_method}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Round Items */}
              {isExpanded && bill.rounds && bill.rounds.length > 0 && (
                <div className="border-t border-purple-500/20 p-5 pt-4 space-y-3 bg-gray-800/30">
                  <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                    <Receipt size={16} />
                    Round Details
                  </h4>
                  {bill.rounds.map((round) => (
                    <div
                      key={round.id}
                      className="bg-gray-900/40 backdrop-blur-sm rounded-lg p-4 border border-purple-500/10"
                    >
                      <div className="text-xs text-purple-400 font-semibold mb-2 uppercase">
                        Round {round.round_number}
                      </div>
                      <div className="space-y-2">
                        {round.round_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center text-sm gap-3"
                          >
                            <span className="text-gray-300 flex-1">
                              <span className="font-semibold text-purple-400">
                                {item.quantity}x
                              </span>{" "}
                              {item.product.name}
                            </span>
                            <span className="font-mono font-bold text-pink-400 whitespace-nowrap">
                              KSh{" "}
                              {(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-purple-500/10 flex justify-between items-center">
                        <span className="text-xs text-gray-400 uppercase font-medium">
                          Round Total
                        </span>
                        <span className="font-bold text-purple-300">
                          KSh{" "}
                          {round.round_items
                            .reduce(
                              (sum, item) => sum + item.price * item.quantity,
                              0
                            )
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredBills.length === 0 && (
          <div className="text-center text-gray-400 py-16 bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10">
            <Receipt size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No bills found</p>
            {hasActiveFilters ? (
              <p className="text-sm mt-2">
                Try adjusting your filters or search query
              </p>
            ) : (
              <p className="text-sm mt-2">No bills have been created yet</p>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredBills.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 pt-2">
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`
                p-2 rounded-lg transition-all duration-200
                ${
                  currentPage === 1
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                }
              `}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Previous Page */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`
                px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1
                ${
                  currentPage === 1
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                }
              `}
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page Numbers */}
            <div className="flex gap-1">
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
                    className={`
                      w-10 h-10 rounded-lg font-medium text-sm transition-all duration-200
                      ${
                        currentPage === pageNum
                          ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 border border-purple-500/50"
                          : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                      }
                    `}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className={`
                px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1
                ${
                  currentPage === totalPages
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                }
              `}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`
                p-2 rounded-lg transition-all duration-200
                ${
                  currentPage === totalPages
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                }
              `}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllBillsView;

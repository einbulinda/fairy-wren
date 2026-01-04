import { Search, Receipt, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useBills } from "../../hooks/useBills";
import { calculateBillTotals } from "../../utils/calculations";
import LoadingSpinner from "./LoadingSpinner";

const ITEMS_PER_PAGE = 10;

const BillsView = () => {
  const { bills, isLoading } = useBills();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return bills;

    return bills.filter((bill) =>
      bill.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, bills]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredBills.slice(startIndex, endIndex);
  }, [filteredBills, currentPage]);

  // Reset to page 1 when search changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-600";
      case "awaiting_confirmation":
        return "bg-yellow-600";
      case "open":
        return "bg-blue-600";
      default:
        return "bg-gray-600";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "awaiting_confirmation":
        return "Pending Confirm";
      default:
        return status;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-pink-500">
            All Bills
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {filteredBills.length} total bills
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-auto">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by customer..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full sm:w-64 lg:w-80 pl-10 pr-10 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-500 placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Bills Grid */}
      <div className="grid gap-3 sm:gap-4">
        {paginatedBills.map((bill) => {
          const totals = calculateBillTotals(bill);
          return (
            <div
              key={bill.id}
              className="bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700 hover:border-pink-500 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                {/* Left Side - Bill Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-xl font-bold truncate">
                    {bill.customer_name}
                  </h3>
                  <div className="space-y-0.5 sm:space-y-1 mt-1">
                    <p className="text-xs sm:text-sm text-gray-400">
                      Served By: {bill.waitress_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(bill.created_at).toLocaleDateString()} at{" "}
                      {new Date(bill.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400">
                      {bill?.rounds.length} round
                      {bill?.rounds.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Right Side - Status and Amount */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-2">
                  <div
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap ${getStatusColor(
                      bill.status
                    )}`}
                  >
                    {getStatusLabel(bill.status)}
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-pink-500">
                      KSh. {totals.total.toLocaleString()}
                    </div>
                    {bill.payment_method && (
                      <div className="text-xs sm:text-sm text-gray-400 uppercase mt-0.5">
                        {bill.payment_method}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredBills.length === 0 && (
          <div className="text-center text-gray-500 py-12 sm:py-16">
            <Receipt
              size={48}
              className="sm:w-16 sm:h-16 mx-auto mb-4 opacity-50"
            />
            <p className="text-base sm:text-lg font-medium">No bills found</p>
            {searchQuery && (
              <p className="text-xs sm:text-sm mt-2">
                Try adjusting your search query
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredBills.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700">
          <div className="text-xs sm:text-sm text-gray-400">
            Page {currentPage} of {totalPages} ({filteredBills.length} total
            bills)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1 text-sm"
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
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-all text-sm sm:text-base ${
                      currentPage === pageNum
                        ? "bg-linear-to-r from-pink-500 to-purple-500 text-white font-bold"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
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
              className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1 text-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillsView;

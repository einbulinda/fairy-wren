import { useState, useEffect, useMemo } from "react";
import LoadingSpinner from "../../shared/LoadingSpinner";

const StockTable = ({ stock, loading, onRestock }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, low, normal
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and search logic
  const filteredStock = useMemo(() => {
    let filtered = [...stock];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus === "low") {
      filtered = filtered.filter((p) => p.current_stock <= 5);
    } else if (filterStatus === "normal") {
      filtered = filtered.filter((p) => p.current_stock > 5);
    }

    return filtered;
  }, [stock, searchTerm, filterStatus]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStock = filteredStock.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  if (loading) {
    return <LoadingSpinner message="Loading Stocks Status Table..." />;
  }
  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full pl-10 pr-4 py-2.5 rounded-lg
              bg-gray-900/40 backdrop-blur-md
              border border-purple-500/20
              text-white placeholder-gray-400
              focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
              transition-all duration-200
            "
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setFilterStatus("all")}
            className={`
              px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
              ${
                filterStatus === "all"
                  ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 border border-purple-500/50"
                  : "bg-gray-900/40 backdrop-blur-md border border-purple-500/20 text-gray-300 hover:border-purple-500/40"
              }
            `}
          >
            All ({stock.length})
          </button>
          <button
            onClick={() => setFilterStatus("low")}
            className={`
              px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
              ${
                filterStatus === "low"
                  ? "bg-linear-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 border border-red-500/50"
                  : "bg-gray-900/40 backdrop-blur-md border border-purple-500/20 text-gray-300 hover:border-red-500/40"
              }
            `}
          >
            Low ({stock.filter((p) => p.current_stock <= 5).length})
          </button>
          <button
            onClick={() => setFilterStatus("normal")}
            className={`
              px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
              ${
                filterStatus === "normal"
                  ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 border border-purple-500/50"
                  : "bg-gray-900/40 backdrop-blur-md border border-purple-500/20 text-gray-300 hover:border-purple-500/40"
              }
            `}
          >
            Normal ({stock.filter((p) => p.current_stock > 5).length})
          </button>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-gray-400 px-1">
        <span>
          Showing {currentStock.length > 0 ? startIndex + 1 : 0} -{" "}
          {Math.min(endIndex, filteredStock.length)} of {filteredStock.length}{" "}
          {filteredStock.length === 1 ? "item" : "items"}
        </span>
        {(searchTerm || filterStatus !== "all") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setFilterStatus("all");
            }}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-purple-500/20 bg-gray-900/40 backdrop-blur-md shadow-lg">
        <table className="w-full text-sm">
          <thead className="bg-linear-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm">
            <tr>
              <th className="px-3 sm:px-4 py-3 text-left font-semibold text-purple-200">
                Product
              </th>
              <th className="px-3 sm:px-4 py-3 text-right font-semibold text-purple-200">
                Stock
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-right font-semibold text-purple-200">
                Unit
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-right font-semibold text-purple-200">
                Cost
              </th>
              <th className="px-3 sm:px-4 py-3 text-right font-semibold text-purple-200">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            {currentStock.map((p) => {
              const lowStock = p.current_stock <= 5;
              return (
                <tr
                  key={p.id}
                  className={`
                    hover:bg-purple-500/5 transition-colors duration-200
                    ${lowStock ? "bg-red-500/10 hover:bg-red-500/15" : ""}
                  `}
                >
                  <td className="px-3 sm:px-4 py-3 text-white">
                    <div className="flex flex-col">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-gray-400 sm:hidden mt-0.5">
                        {p.unit}
                        {p.cost_price && <> · KSh {p.cost_price.toFixed(2)}</>}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    <span
                      className={`
                      inline-flex items-center justify-center min-w-12 px-2 py-1 rounded-lg
                      font-mono font-semibold text-sm
                      ${
                        lowStock
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      }
                    `}
                    >
                      {p.current_stock}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-right text-gray-300">
                    {p.unit}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-right text-gray-300 font-mono">
                    {p.cost_price ? `KSh ${p.cost_price.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    <button
                      onClick={() => onRestock(p)}
                      className="
                        px-3 py-1.5 rounded-lg
                        bg-linear-to-r from-purple-600 to-pink-600
                        hover:from-purple-700 hover:to-pink-700
                        text-white font-medium text-sm
                        shadow-lg shadow-purple-500/20
                        transition-all duration-200
                        hover:shadow-purple-500/40 hover:scale-105
                        active:scale-95
                        border border-purple-500/30
                        min-w-18
                      "
                    >
                      Restock
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {currentStock.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-lg font-medium">No items found</p>
            <p className="text-sm mt-1">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "Add products to track inventory"}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
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
                px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200
                ${
                  currentPage === 1
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                }
              `}
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="hidden sm:flex items-center gap-1">
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
                px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200
                ${
                  currentPage === totalPages
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/20"
                }
              `}
            >
              Next
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

export default StockTable;

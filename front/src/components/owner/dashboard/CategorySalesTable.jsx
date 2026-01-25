import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const CategorySalesTable = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("total_revenue");
  const [sortDirection, setSortDirection] = useState("desc");
  const itemsPerPage = 7;

  console.log("Category Sales Data:", data);

  // Sort data
  const sortedData = [...(data || [])].sort((a, b) => {
    let aValue, bValue;

    if (sortField === "category") {
      aValue = a.category_name?.toLowerCase() || "";
      bValue = b.category_name?.toLowerCase() || "";
    } else if (sortField === "total_revenue") {
      aValue = parseFloat(a.total_sales) || 0;
      bValue = parseFloat(b.total_sales) || 0;
    } else if (sortField === "quantity_sold") {
      aValue = parseInt(a.total_quantity) || 0;
      bValue = parseInt(b.total_quantity) || 0;
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return (
        <ChevronUp className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-50" />
      );
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3 h-3 text-pink-400" />
    ) : (
      <ChevronDown className="w-3 h-3 text-pink-400" />
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No category data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-purple-500/20">
            <tr>
              <th
                onClick={() => handleSort("category")}
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1">
                  Category
                  <SortIcon field="category" />
                </div>
              </th>
              <th
                onClick={() => handleSort("quantity_sold")}
                className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  Qty Sold
                  <SortIcon field="quantity_sold" />
                </div>
              </th>
              <th
                onClick={() => handleSort("total_revenue")}
                className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  Revenue
                  <SortIcon field="total_revenue" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            {paginatedData.map((item, index) => (
              <tr key={index} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">
                  {item.category_name || "Un-categorized"}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {parseInt(item.total_quantity || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-green-400 font-semibold">
                    KES {parseFloat(item.total_sales || 0).toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-purple-500/10">
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)}{" "}
            of {sortedData.length} categories
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-purple-500/20 text-white transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded border transition-colors ${
                          currentPage === page
                            ? "bg-linear-to-r from-pink-500 to-purple-600 border-pink-500 text-white"
                            : "bg-white/5 hover:bg-white/10 border-purple-500/20 text-white"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span key={page} className="text-gray-400">
                        ...
                      </span>
                    );
                  }
                  return null;
                },
              )}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-purple-500/20 text-white transition-colors flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySalesTable;

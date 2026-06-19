import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const CategorySalesTable = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("total_revenue");
  const [sortDirection, setSortDirection] = useState("desc");
  const itemsPerPage = 7;

  const sortedData = [...(data || [])].sort((a, b) => {
    let aVal, bVal;
    if (sortField === "category") { aVal = a.category_name?.toLowerCase() || ""; bVal = b.category_name?.toLowerCase() || ""; }
    else if (sortField === "total_revenue") { aVal = parseFloat(a.total_sales) || 0; bVal = parseFloat(b.total_sales) || 0; }
    else if (sortField === "quantity_sold") { aVal = parseInt(a.total_quantity) || 0; bVal = parseInt(b.total_quantity) || 0; }
    return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("desc"); }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-surface-600 opacity-0 group-hover:opacity-50" />;
    return sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-primary-400" /> : <ChevronDown className="w-3 h-3 text-primary-400" />;
  };

  if (!data || data.length === 0) return <div className="text-center py-8 text-surface-400">No category data available</div>;

  const maxRevenue = Math.max(...sortedData.map((d) => parseFloat(d.total_sales) || 0), 1);

  const fmtK = (v) => {
    if (!v) return "0";
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return String(Math.round(v));
  };

  const Pagination = () =>
    totalPages > 1 ? (
      <div className="flex items-center justify-between pt-3 border-t border-surface-700/50">
        <span className="text-xs text-surface-400">
          {startIndex + 1}–{Math.min(startIndex + itemsPerPage, sortedData.length)} of {sortedData.length}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 rounded-lg border border-surface-600 text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-surface-300 tabular-nums px-1">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 rounded-lg border border-surface-600 text-white transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-3">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-surface-700">
            <tr>
              {[["category", "Category", "text-left"], ["quantity_sold", "Qty Sold", "text-right"], ["total_revenue", "Revenue", "text-right"]].map(([field, label, align]) => (
                <th key={field} onClick={() => handleSort(field)} className={`px-4 py-3 ${align} text-xs font-medium text-surface-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group`}>
                  <div className={`flex items-center gap-1 ${align === "text-right" ? "justify-end" : ""}`}>{label}<SortIcon field={field} /></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/50">
            {paginatedData.map((item, index) => (
              <tr key={index} className="hover:bg-surface-800/50 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{item.category_name || "Uncategorized"}</td>
                <td className="px-4 py-3 text-right text-surface-300">{parseInt(item.total_quantity || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right"><span className="text-emerald-400 font-semibold">KES {parseFloat(item.total_sales || 0).toLocaleString()}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — rank + bar + compact amounts */}
      <div className="md:hidden space-y-1">
        {paginatedData.map((item, index) => {
          const revenue = parseFloat(item.total_sales) || 0;
          const qty     = parseInt(item.total_quantity) || 0;
          const pct     = (revenue / maxRevenue) * 100;
          const rank    = startIndex + index + 1;

          return (
            <div key={index} className="py-2.5 border-b border-surface-700/40 last:border-0">
              {/* Name row */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-surface-500 w-5 shrink-0 tabular-nums">#{rank}</span>
                <span className="text-sm font-medium text-white flex-1 truncate min-w-0">
                  {item.category_name || "Uncategorized"}
                </span>
                <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0">
                  KES {fmtK(revenue)}
                </span>
              </div>
              {/* Bar + qty row */}
              <div className="flex items-center gap-2 mt-1.5 pl-7">
                <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-surface-500 tabular-nums shrink-0">{qty.toLocaleString()} sold</span>
              </div>
            </div>
          );
        })}
      </div>

      <Pagination />
    </div>
  );
};

export default CategorySalesTable;
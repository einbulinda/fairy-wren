import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { MobileCard, MobileField, MobileCardList } from "@/components/shared/MobileCard";

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

  return (
    <div className="space-y-4">
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

      <MobileCardList>
        {paginatedData.map((item, index) => (
          <MobileCard key={index}>
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">{item.category_name || "Uncategorized"}</span>
              <span className="text-emerald-400 font-semibold text-sm">KES {parseFloat(item.total_sales || 0).toLocaleString()}</span>
            </div>
            <div className="text-xs text-surface-400">Qty Sold: <span className="text-surface-300">{parseInt(item.total_quantity || 0).toLocaleString()}</span></div>
          </MobileCard>
        ))}
      </MobileCardList>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-surface-700/50">
          <div className="text-sm text-surface-400">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedData.length)} of {sortedData.length}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-surface-800 hover:bg-surface-700 disabled:opacity-50 rounded border border-surface-600 text-white transition-colors flex items-center gap-1"><ChevronLeft className="w-4 h-4" />Prev</button>
            <span className="text-sm text-surface-300">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-surface-800 hover:bg-surface-700 disabled:opacity-50 rounded border border-surface-600 text-white transition-colors flex items-center gap-1">Next<ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySalesTable;
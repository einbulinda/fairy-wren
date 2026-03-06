import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { MobileCard, MobileField, MobileCardList } from "@/components/shared/MobileCard";

const OutstandingBillsTable = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("days_outstanding");
  const [sortDirection, setSortDirection] = useState("desc");
  const itemsPerPage = 10;

  const calculateDaysOutstanding = (createdAt) => {
    const diffTime = Math.abs(new Date() - new Date(createdAt));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const copyBillId = (billId) => { navigator.clipboard.writeText(billId); toast.success("Bill ID copied!"); };

  const enhancedData = (data || []).map((item) => ({
    ...item,
    days_outstanding: calculateDaysOutstanding(item.created_at),
    customer_name: item.customer_name || item.customer?.name || "Walk-in Customer",
    served_by: item.served_by || item.user?.name || "Unknown",
  }));

  const sortedData = [...enhancedData].sort((a, b) => {
    let aVal, bVal;
    if (sortField === "days_outstanding") { aVal = a.days_outstanding; bVal = b.days_outstanding; }
    else if (sortField === "bill_total") { aVal = parseFloat(a.bill_total) || 0; bVal = parseFloat(b.bill_total) || 0; }
    else if (sortField === "balance") { aVal = (parseFloat(a.bill_total) || 0) - (parseFloat(a.paid_amount) || 0); bVal = (parseFloat(b.bill_total) || 0) - (parseFloat(b.paid_amount) || 0); }
    else if (sortField === "created_at") { aVal = new Date(a.created_at); bVal = new Date(b.created_at); }
    else { aVal = a[sortField]?.toString().toLowerCase() || ""; bVal = b[sortField]?.toString().toLowerCase() || ""; }
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

  const getDaysColor = (days) => {
    if (days >= 30) return "text-danger";
    if (days >= 14) return "text-orange-400";
    if (days >= 7) return "text-warning";
    return "text-surface-400";
  };

  if (!data || data.length === 0) return <div className="text-center py-8 text-surface-400">No outstanding bills</div>;

  return (
    <div className="space-y-4">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-surface-700">
            <tr>
              {[["bill_id", "Bill #"], ["customer_name", "Customer"], ["served_by", "Staff"], ["created_at", "Date"], ["days_outstanding", "Days Out"], ["bill_total", "Total"], ["paid_amount", "Paid"], ["balance", "Balance"]].map(([field, label]) => (
                <th key={field} onClick={() => handleSort(field)} className="px-3 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center gap-1">{label}<SortIcon field={field} /></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/50">
            {paginatedData.map((bill, index) => {
              const balance = (parseFloat(bill.bill_total) || 0) - (parseFloat(bill.paid_amount) || 0);
              return (
                <tr key={index} className="hover:bg-surface-800/50 transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-surface-300 text-xs">{bill.bill_id.slice(0, 8)}...</span>
                      <button onClick={() => copyBillId(bill.bill_id)} className="p-1 rounded hover:bg-surface-700 transition-colors"><Copy size={12} className="text-primary-400" /></button>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-white font-medium text-sm">{bill.customer_name}</td>
                  <td className="px-3 py-3 text-surface-300 text-sm">{bill.served_by}</td>
                  <td className="px-3 py-3 text-surface-300 text-sm">{new Date(bill.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="px-3 py-3"><div className="flex items-center gap-1"><Clock className={`w-3 h-3 ${getDaysColor(bill.days_outstanding)}`} /><span className={`font-semibold ${getDaysColor(bill.days_outstanding)}`}>{bill.days_outstanding}</span></div></td>
                  <td className="px-3 py-3 text-surface-300 text-sm">KES {parseFloat(bill.bill_total || 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-emerald-400 text-sm">KES {parseFloat(bill.paid_amount || 0).toLocaleString()}</td>
                  <td className="px-3 py-3"><span className="text-danger font-semibold text-sm">KES {balance.toLocaleString()}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <MobileCardList>
        {paginatedData.map((bill, index) => {
          const balance = (parseFloat(bill.bill_total) || 0) - (parseFloat(bill.paid_amount) || 0);
          return (
            <MobileCard key={index}>
              <div className="flex items-center justify-between">
                <span className="text-white font-medium text-sm">{bill.customer_name}</span>
                <div className="flex items-center gap-1">
                  <Clock className={`w-3 h-3 ${getDaysColor(bill.days_outstanding)}`} />
                  <span className={`text-xs font-semibold ${getDaysColor(bill.days_outstanding)}`}>{bill.days_outstanding}d</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-surface-400">{bill.bill_id.slice(0, 8)}...</span>
                <button onClick={() => copyBillId(bill.bill_id)} className="p-0.5 rounded hover:bg-surface-700 transition-colors"><Copy size={10} className="text-primary-400" /></button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-400">{new Date(bill.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <span className="text-surface-400">{bill.served_by}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="space-x-3">
                  <span className="text-surface-300">KES {parseFloat(bill.bill_total || 0).toLocaleString()}</span>
                  <span className="text-emerald-400 text-xs">Paid {parseFloat(bill.paid_amount || 0).toLocaleString()}</span>
                </div>
                <span className="text-danger font-semibold">KES {balance.toLocaleString()}</span>
              </div>
            </MobileCard>
          );
        })}
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

export default OutstandingBillsTable;
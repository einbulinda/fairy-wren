import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";

const OutstandingBillsTable = ({ data }) => {
  console.log("Outstanding Bills Data:", data);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("days_outstanding");
  const [sortDirection, setSortDirection] = useState("desc");
  const itemsPerPage = 10;

  // Calculate days outstanding
  const calculateDaysOutstanding = (createdAt) => {
    const created = new Date(createdAt);
    const today = new Date();
    const diffTime = Math.abs(today - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Copy Bill ID
  const copyBillId = (billId) => {
    navigator.clipboard.writeText(billId);
    toast.success("Bill ID copied!");
  };

  // Enhance data with calculated fields
  const enhancedData = (data || []).map((item) => ({
    ...item,
    days_outstanding: calculateDaysOutstanding(item.created_at),
    customer_name:
      item.customer_name || item.customer?.name || "Walk-in Customer",
    served_by:
      item.served_by || item.user?.name || item.user?.username || "Unknown",
  }));

  // Sort data
  const sortedData = [...enhancedData].sort((a, b) => {
    let aValue, bValue;

    if (sortField === "bill_id") {
      aValue = a.bill_id || "";
      bValue = b.bill_id || "";
    } else if (sortField === "customer_name") {
      aValue = a.customer_name.toLowerCase();
      bValue = b.customer_name.toLowerCase();
    } else if (sortField === "served_by") {
      aValue = a.served_by.toLowerCase();
      bValue = b.served_by.toLowerCase();
    } else if (sortField === "bill_total") {
      aValue = parseFloat(a.bill_total) || 0;
      bValue = parseFloat(b.bill_total) || 0;
    } else if (sortField === "paid_amount") {
      aValue = parseFloat(a.paid_amount) || 0;
      bValue = parseFloat(b.paid_amount) || 0;
    } else if (sortField === "balance") {
      aValue =
        (parseFloat(a.bill_total) || 0) - (parseFloat(a.paid_amount) || 0);
      bValue =
        (parseFloat(b.bill_total) || 0) - (parseFloat(b.paid_amount) || 0);
    } else if (sortField === "days_outstanding") {
      aValue = a.days_outstanding;
      bValue = b.days_outstanding;
    } else if (sortField === "created_at") {
      aValue = new Date(a.created_at);
      bValue = new Date(b.created_at);
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
      <ChevronUp className="w-3 h-3 text-red-400" />
    ) : (
      <ChevronDown className="w-3 h-3 text-red-400" />
    );
  };

  // Get color for days outstanding
  const getDaysColor = (days) => {
    if (days >= 30) return "text-red-400";
    if (days >= 14) return "text-orange-400";
    if (days >= 7) return "text-yellow-400";
    return "text-gray-400";
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">No outstanding bills</div>
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
                onClick={() => handleSort("bill_id")}
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1">
                  Bill #
                  <SortIcon field="bill_id" />
                </div>
              </th>
              <th
                onClick={() => handleSort("customer_name")}
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1">
                  Customer
                  <SortIcon field="customer_name" />
                </div>
              </th>
              <th
                onClick={() => handleSort("served_by")}
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1">
                  Staff
                  <SortIcon field="served_by" />
                </div>
              </th>
              <th
                onClick={() => handleSort("created_at")}
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1">
                  Date
                  <SortIcon field="created_at" />
                </div>
              </th>
              <th
                onClick={() => handleSort("days_outstanding")}
                className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center justify-center gap-1">
                  Days Out
                  <SortIcon field="days_outstanding" />
                </div>
              </th>
              <th
                onClick={() => handleSort("bill_total")}
                className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  Total
                  <SortIcon field="bill_total" />
                </div>
              </th>
              <th
                onClick={() => handleSort("paid_amount")}
                className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  Paid
                  <SortIcon field="paid_amount" />
                </div>
              </th>
              <th
                onClick={() => handleSort("balance")}
                className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  Balance
                  <SortIcon field="balance" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            {paginatedData.map((bill, index) => {
              const balance =
                (parseFloat(bill.bill_total) || 0) -
                (parseFloat(bill.paid_amount) || 0);

              return (
                <tr key={index} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-300 text-xs">
                        {bill.bill_id.slice(0, 8)}...
                      </span>
                      <button
                        onClick={() => copyBillId(bill.bill_id)}
                        className="p-1 rounded hover:bg-purple-500/20 transition-colors"
                        title="Copy full Bill ID"
                      >
                        <Copy size={14} className="text-purple-400" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">
                      {bill.customer_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{bill.served_by}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    {new Date(bill.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock
                        className={`w-3 h-3 ${getDaysColor(bill.days_outstanding)}`}
                      />
                      <span
                        className={`font-semibold ${getDaysColor(bill.days_outstanding)}`}
                      >
                        {bill.days_outstanding}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    KES {parseFloat(bill.bill_total || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-green-400">
                    KES {parseFloat(bill.paid_amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-red-400 font-semibold">
                      KES {balance.toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-purple-500/10">
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)}{" "}
            of {sortedData.length} bills
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

export default OutstandingBillsTable;

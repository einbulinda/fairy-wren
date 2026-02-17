import { useState, useMemo } from "react";
import { Search, X, Receipt, Copy } from "lucide-react";
import { calculateBillTotals } from "../utils/calculations";
import toast from "react-hot-toast";

const AllBillsView = ({ bills }) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter bills based on search
  const filteredBills = useMemo(() => {
    if (!searchTerm.trim()) return bills;
    return bills.filter((bill) =>
      bill.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bills, searchTerm]);

  const copyBillId = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

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
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-3 rounded-lg bg-gray-900/40 backdrop-blur-md border border-purple-500/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-gray-400 px-1">
        <span>
          {filteredBills.length} {filteredBills.length === 1 ? "bill" : "bills"}{" "}
          found
        </span>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Bills Grid */}
      <div className="grid gap-4">
        {filteredBills.map((bill, index) => {
          const totals = calculateBillTotals(bill);
          const isEvenRow = index % 2 === 0;

          return (
            <div
              key={bill.id}
              className={`
                bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10 p-5
                transition-all duration-200
                hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10
                ${isEvenRow ? "bg-gray-900/30" : ""}
              `}
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
                          onClick={() => copyBillId(bill.id)}
                          className="p-1 rounded hover:bg-purple-500/20 transition-colors shrink-0"
                          title="Copy Bill ID"
                        >
                          <Copy size={14} className="text-purple-400" />
                        </button>
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
          );
        })}

        {filteredBills.length === 0 && (
          <div className="text-center text-gray-400 py-16 bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10">
            <Receipt size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No bills found</p>
            {searchTerm && (
              <p className="text-sm mt-2">Try adjusting your search query</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllBillsView;

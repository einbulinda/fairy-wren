import React from "react";
import { X, Clock, User, Receipt } from "lucide-react";
import { calculateBillTotals } from "@/utils/calculations";

const BetaOpenBillsModal = ({ bills, onSelectBill, onClose, title }) => {
  // Calculate total for each bill using the same utility as classic
  const getBillTotal = (bill) => {
    try {
      return calculateBillTotals(bill).total;
    } catch (error) {
      console.error("Error calculating bill total:", error, bill);
      return 0;
    }
  };

  // Format time since
  const getTimeSince = (dateStr) => {
    try {
      if (!dateStr) return "Unknown";
      const created = new Date(dateStr);
      const now = new Date();
      const diffMins = Math.floor((now - created) / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
    } catch (error) {
      return "Unknown";
    }
  };

  // Get bill creator name
  const getCreatorName = (bill) => {
    if (bill.created_by_user?.full_name) {
      return bill.created_by_user.full_name.split(" ")[0];
    }
    if (bill.created_by_user?.name) {
      return bill.created_by_user.name.split(" ")[0];
    }
    if (bill.waitress?.name) {
      return bill.waitress.name.split(" ")[0];
    }
    return "Staff";
  };

  // Get round count
  const getRoundCount = (bill) => {
    if (!bill?.rounds) return 0;
    return Array.isArray(bill.rounds) ? bill.rounds.length : 0;
  };

  // Ensure bills is an array
  const billsList = Array.isArray(bills) ? bills : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className="w-full lg:max-w-md bg-slate-900 rounded-t-2xl lg:rounded-2xl border border-slate-700/50 shadow-2xl max-h-[80vh] lg:max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{title || "Open Bills"}</h2>
            <p className="text-sm text-gray-400">{billsList.length} bill{billsList.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Bills List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {billsList.length === 0 ? (
            <div className="text-center py-12">
              <Receipt size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No open bills</p>
              <p className="text-sm text-gray-500 mt-1">
                Start a new bill to get started
              </p>
            </div>
          ) : (
            billsList.map((bill) => (
              <button
                key={bill.id}
                onClick={() => onSelectBill(bill)}
                className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/30 hover:border-pink-500/30 rounded-xl transition-all text-left group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="font-bold text-white text-lg group-hover:text-pink-400 transition-colors truncate">
                      {bill.customer_name || "Unnamed"}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {getTimeSince(bill.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {getCreatorName(bill)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                      KSh {getBillTotal(bill).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getRoundCount(bill)} round{getRoundCount(bill) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BetaOpenBillsModal;

import React from "react";
import {
  Plus,
  Minus,
  Trash2,
  Send,
  CreditCard,
  Ban,
  Printer,
  X,
  AlertCircle,
  Clock,
  Users,
  User,
} from "lucide-react";
import { calculateBillTotals } from "@/utils/calculations";

const BetaCurrentBill = ({
  bill,
  currentRoundItems,
  onClose,
  onRemoveItem,
  onUpdateQuantity,
  onAddRound,
  onOpenPayment,
  onVoidBill,
  onShowReceipt,
  isAddingRound,
  stockWarnings,
  hasCriticalStockError,
  onNewBill,
  onOpenBills,
  onMyBills,
  openBillsCount,
  myBillsCount,
}) => {
  // Calculate totals using the same utility as classic
  const existingTotal = calculateBillTotals(bill).total;
  const currentRoundTotal = currentRoundItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalDue = existingTotal + currentRoundTotal;

  // Format time since bill created
  const getTimeSince = (dateStr) => {
    const created = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - created) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
  };

  return (
    <>
      {/* Bill Header */}
      <div className="p-3 lg:p-4 border-b border-slate-700/30 bg-slate-900/30">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-white">
              {bill.customer_name}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
              <Clock size={14} />
              <span>{getTimeSince(bill.created_at)}</span>
              <span className="text-slate-600">•</span>
              <span className="text-pink-400">
                {bill.rounds?.length || 0} rounds
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Existing Rounds (Collapsed summary) */}
      {bill.rounds?.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-700/20 bg-slate-900/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Previous rounds</span>
            <span className="font-semibold text-white">
              KSh {existingTotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Current Round Items */}
      <div className="flex-1 overflow-y-auto p-3 lg:p-4">
        {currentRoundItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3">
              <Plus size={28} className="text-gray-500" />
            </div>
            <p className="text-gray-400 font-medium">Tap products to add</p>
            <p className="text-sm text-gray-500 mt-1">
              Current items will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentRoundItems.map((item) => {
              const warning = stockWarnings[item.id];
              return (
                <div
                  key={item.id}
                  className={`group flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border transition-all ${
                    warning?.severity === "error"
                      ? "border-red-500/50 bg-red-500/10"
                      : warning?.severity === "warning"
                      ? "border-orange-500/50 bg-orange-500/10"
                      : "border-slate-700/30 hover:border-slate-600/50"
                  }`}
                >
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 flex items-center justify-center transition-colors"
                    >
                      <Minus size={14} className="text-white" />
                    </button>
                    <span className="w-10 text-center font-bold text-lg text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 flex items-center justify-center transition-colors"
                    >
                      <Plus size={14} className="text-white" />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {item.productName}
                    </p>
                    {warning && (
                      <p
                        className={`text-xs flex items-center gap-1 ${
                          warning.severity === "error"
                            ? "text-red-400"
                            : "text-orange-400"
                        }`}
                      >
                        <AlertCircle size={10} />
                        {warning.message}
                      </p>
                    )}
                  </div>

                  {/* Total */}
                  <div className="text-right">
                    <p className="font-bold text-white">
                      KSh {(item.price * item.quantity).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      @ KSh {item.price.toLocaleString()}
                    </p>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bill Footer */}
      <div className="p-3 lg:p-4 border-t border-slate-700/30 bg-slate-900/50">
        {/* Total Summary */}
        <div className="flex items-center justify-between mb-4 p-3 bg-slate-800/50 rounded-xl">
          <span className="text-gray-400">Total Due</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            KSh {totalDue.toLocaleString()}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {currentRoundItems.length > 0 ? (
            <>
              <button
                onClick={onAddRound}
                disabled={isAddingRound || hasCriticalStockError}
                className="col-span-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                {isAddingRound ? (
                  "Adding..."
                ) : (
                  <>
                    <Send size={18} />
                    Add
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="col-span-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onOpenPayment}
                disabled={!bill.rounds?.length}
                className="col-span-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <CreditCard size={18} />
                Pay
              </button>
              <button
                onClick={onVoidBill}
                className="col-span-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <Ban size={18} />
                Void
              </button>
            </>
          )}
        </div>

        {/* Secondary Actions */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={onShowReceipt}
            className="flex-1 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-sm text-gray-400 hover:text-white transition-all flex items-center justify-center gap-1"
          >
            <Printer size={14} />
            Print
          </button>
        </div>

        {/* Mobile Quick Actions - Bill Switching */}
        <div className="lg:hidden mt-3 pt-3 border-t border-slate-700/30">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onNewBill}
              className="flex flex-col items-center gap-1 p-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-xl transition-all"
            >
              <Plus size={18} />
              <span className="text-xs font-medium">New Bill</span>
            </button>
            <button
              onClick={onOpenBills}
              className="flex flex-col items-center gap-1 p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all relative"
            >
              <Users size={18} />
              <span className="text-xs font-medium">Open</span>
              {openBillsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full text-xs font-bold flex items-center justify-center">
                  {openBillsCount > 9 ? "9+" : openBillsCount}
                </span>
              )}
            </button>
            <button
              onClick={onMyBills}
              className="flex flex-col items-center gap-1 p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all relative"
            >
              <User size={18} />
              <span className="text-xs font-medium">Mine</span>
              {myBillsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full text-xs font-bold flex items-center justify-center">
                  {myBillsCount > 9 ? "9+" : myBillsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BetaCurrentBill;

import {
  Plus,
  Minus,
  Trash2,
  Check,
  AlertCircle,
  X,
  Receipt,
  FileText,
} from "lucide-react";
import { calculateBillTotals } from "../../utils/calculations";

const CurrentBill = ({
  bill,
  currentRoundItems,
  onClose,
  onRemoveItem,
  onUpdateQuantity,
  onAddRound,
  onOpenPayment,
  onVoidBill,
  onShowReceipt,
}) => {
  const calculateCurrentRoundTotal = () => {
    return currentRoundItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  };

  const currentRoundTotal = calculateCurrentRoundTotal();
  const billTotals = calculateBillTotals(bill);

  return (
    <div className="lg:col-span-1">
      <div className="bg-linear-to-br from-gray-900/60 to-gray-800/60 backdrop-blur-md rounded-xl border border-purple-500/20 p-5 shadow-xl sticky  max-h-[calc(100vh-120px)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
            <Receipt size={20} />
            Current Bill
          </h3>
          {bill && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {bill ? (
          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Customer Info */}
            <div className="bg-purple-900/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/20">
              <p className="text-xs text-purple-300 font-semibold mb-1">
                Customer
              </p>
              <p className="text-lg font-bold text-white">
                {bill.customer_name}
              </p>
            </div>

            {/* Previous Rounds */}
            {bill.rounds && bill.rounds.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider">
                  Previous Rounds
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {bill.rounds.map((round) => (
                    <div
                      key={round.id}
                      className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-2 border border-purple-500/10"
                    >
                      <div className="text-xs text-purple-400 font-semibold mb-1">
                        Round {round.round_number}
                      </div>
                      <div className="space-y-0.5">
                        {round.round_items.map((item) => (
                          <div
                            key={item.product.id}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-gray-300">
                              {item.quantity}x {item.product.name}
                            </span>
                            <span className="font-mono font-semibold text-pink-400">
                              KSh {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Round Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider">
                  Current Round
                </p>
                {currentRoundItems.length > 0 && (
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                    {currentRoundItems.length} items
                  </span>
                )}
              </div>

              {currentRoundItems.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {currentRoundItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-linear-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-lg p-2 border border-purple-500/20"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium text-white text-sm truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-purple-300">
                            KSh {item.price.toFixed(2)} each
                          </p>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-red-400 hover:text-red-300 transition-colors shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-gray-900/40 rounded-lg p-0.5">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="p-1 rounded hover:bg-purple-500/20 text-purple-300 transition-colors"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="text-sm font-bold text-white px-2">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-1 rounded hover:bg-purple-500/20 text-purple-300 transition-colors"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <span className="font-mono font-bold text-pink-400 text-sm">
                          KSh {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-xs bg-gray-900/20 rounded-lg border border-purple-500/10">
                  No items in current round
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 pt-3 border-t border-purple-500/20">
              {billTotals && billTotals.subtotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Previous:</span>
                  <span className="font-mono text-white">
                    KSh {billTotals.subtotal.toFixed(2)}
                  </span>
                </div>
              )}
              {currentRoundTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current:</span>
                  <span className="font-mono text-white">
                    KSh {currentRoundTotal.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1.5 border-t border-purple-500/10">
                <span className="text-base font-bold text-purple-300">
                  Total:
                </span>
                <span className="text-xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  KSh{" "}
                  {((billTotals?.subtotal || 0) + currentRoundTotal).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-3">
              {currentRoundItems.length > 0 && (
                <button
                  onClick={onAddRound}
                  className="w-full py-3.5 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 text-base touch-manipulation"
                >
                  <Plus size={20} />
                  Add Round to Bill
                </button>
              )}
              {bill.rounds && bill.rounds.length > 0 && (
                <button
                  onClick={onOpenPayment}
                  disabled={currentRoundItems.length > 0}
                  className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg text-base touch-manipulation ${
                    currentRoundItems.length > 0
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:scale-95 shadow-green-500/30"
                  }`}
                >
                  <Check size={20} />
                  Payment
                </button>
              )}

              {/* View Receipt - Only show if bill has rounds */}
              {bill.rounds && bill.rounds.length > 0 && (
                <button
                  onClick={() => onShowReceipt(true)}
                  className="w-full py-3.5 bg-gray-700 hover:bg-gray-600 active:scale-95 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm touch-manipulation"
                >
                  <FileText size={18} />
                  Receipt
                </button>
              )}

              {/* Void Bill Button - Always available for open bills */}
              <button
                onClick={onVoidBill}
                className="w-full py-3.5 bg-red-900/40 border-2 border-red-500/30 hover:bg-red-900/60 hover:border-red-500/50 active:scale-95 text-red-400 hover:text-red-300 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm touch-manipulation"
              >
                <AlertCircle size={18} />
                Void
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 flex-1 flex flex-col items-center justify-center">
            <AlertCircle size={40} className="mx-auto mb-2 opacity-50" />
            <p className="font-medium text-sm">No active bill</p>
            <p className="text-xs mt-1">Start new or select open bill</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentBill;

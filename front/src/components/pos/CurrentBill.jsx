import { useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Check,
  AlertCircle,
  X,
  Receipt,
} from "lucide-react";
import { calculateBillTotals } from "../../utils/calculations";
import ReceiptModal from "../shared/ReceiptModal";

const CurrentBill = ({
  bill,
  currentRoundItems,
  onUpdateQuantity,
  onRemoveItem,
  onAddRound,
  onCloseBill,
  isMobile = false,
}) => {
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const calculateCurrentRoundTotal = () => {
    return currentRoundItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  };

  const handleCloseWithReceipt = (bill) => {
    if (currentRoundItems.length > 0) {
      alert("Please add current round before closing");
      return;
    }
    if (!bill || bill.rounds.length === 0) {
      alert("Cannot close bill with no items");
      return;
    }
    setShowReceiptModal(true);
  };

  const currentRoundTotal = calculateCurrentRoundTotal();
  const billTotals = calculateBillTotals(bill);

  return (
    <>
      <div
        className={`bg-gray-800 rounded-lg border border-gray-700 ${
          isMobile ? "p-4" : "p-4 sm:p-5 sticky top-4"
        }`}
      >
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-pink-500">
          Current Bill
        </h2>

        {bill ? (
          <>
            {/* Bill Header */}
            <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-700">
              <div className="text-xs sm:text-sm  text-gray-400">Customer</div>
              <div className="font-semibold text-base sm:text-lg truncate">
                {bill.customer_name}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(bill.created_at).toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm text-pink-500 mt-2">
                {bill?.rounds.length || 0} round{" "}
                {bill?.rounds.length !== 1 ? "s" : ""} added
              </div>
            </div>

            {/* Current Round Items */}
            <div className="mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-semibold text-purple-400 mb-2">
                Current Round {bill.rounds.length + 1}
              </h3>

              {currentRoundItems.length > 0 ? (
                <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                  {currentRoundItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 bg-purple-900 bg-opacity-30 p-2 sm:p-3 rounded-lg"
                    >
                      {/* Product Name */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm sm:text-base truncate">
                          {item.productName}
                        </div>
                        <div className="text-xs text-gray-400 sm:hidden">
                          KSh. {item.price.toLocaleString()} each
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="bg-gray-600 rounded hover:bg-gray-500 p-1.5 sm:p-2 transition-colors active:scale-95"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} className="sm:w-4 sm:h-4" />
                          </button>
                          <span className="w-10 sm:w-12 text-center font-semibold text-sm sm:text-base">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-1.5 sm:p-2 bg-gray-600 rounded hover:bg-gray-500 transition-colors active:scale-95"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} className="sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1.5 sm:p-2 bg-red-600 rounded hover:bg-red-700 transition-colors active:scale-95 ml-1"
                            aria-label="Remove item"
                          >
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        </div>

                        {/* Item Total */}
                        <div className="font-semibold text-pink-500 text-sm sm:text-base whitespace-nowrap">
                          KSh. {(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-6 sm:py-8 text-xs sm:text-sm">
                  No items in current round
                </div>
              )}

              {currentRoundItems.length > 0 && (
                <>
                  <div className="mt-3 pt-3 border-t border-purple-500">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="font-medium">Round Total:</span>
                      <span className="font-bold text-pink-500">
                        Ksh. {currentRoundTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onAddRound}
                    className="mt-3 w-full py-2.5 sm:py-3 rounded-lg font-semibold 
                    bg-linear-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 transition-all active:scale-98 
                    flex items-center justify-center text-sm sm:text-base"
                  >
                    <Check size={18} className="mr-1.5" />
                    Add Round to Bill
                  </button>
                </>
              )}
            </div>

            {/* Bill summary */}
            {bill?.rounds.length > 0 && (
              <div className="border-t border-gray-700 pt-3 sm:pt-4">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-400 mb-2">
                  Bill Summary
                </h3>

                <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto mb-3">
                  {bill.rounds.map((round, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-700 p-2 sm:p-3 rounded-lg"
                    >
                      <div className="text-xs text-gray-400 mb-1">
                        Round {round.round_number} -{" "}
                        {new Date(round.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="space-y-1">
                        {round.round_items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="flex justify-between text-xs sm:text-sm gap-2"
                          >
                            <span className="truncate flex-1">
                              {item.quantity}x {item.product_name}
                            </span>
                            <span className="text-pink-500 font-medium whitespace-nowrap">
                              KSh.{" "}
                              {(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 bg-gray-700 p-3 sm:p-4 rounded-lg">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-300">Subtotal:</span>
                    <span className="font-semibold">
                      KSh. {billTotals.subtotal.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between text-base sm:text-xl font-bold text-pink-500 pt-2 border-t border-gray-600">
                    <span>TOTAL:</span>
                    <span>{billTotals.total.toLocaleString()} KES</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 sm:mt-4">
                  <button
                    onClick={() => handleCloseWithReceipt(bill)}
                    className="py-2.5 sm:py-3 bg-linear-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all active:scale-98 
                    flex items-center justify-center text-sm sm:text-base"
                  >
                    <Receipt size={16} className="mr-1.5 sm:w-5 sm:h-5" />
                    Close & Receipt
                  </button>
                  <button
                    onClick={onCloseBill}
                    className="py-2.5 sm:py-3 bg-linear-to-r from-blue-600 to-indigo-600 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all 
                    active:scale-98 flex items-center justify-center text-sm sm:text-base"
                  >
                    <X size={16} className="mr-1.5 sm:w-5 sm:h-5" />
                    Close Bill
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 py-8 sm:py-12">
            <AlertCircle
              size={40}
              className="sm:w-12 sm:h-12 mx-auto mb-2 opacity-50"
            />
            <p className="text-sm sm:text-base font-medium">No active bill</p>
            <p className="text-xs sm:text-sm mt-1">
              Start new bill or select open bill
            </p>
          </div>
        )}
      </div>

      {showReceiptModal && bill && (
        <ReceiptModal bill={bill} onClose={() => setShowReceiptModal(false)} />
      )}

      <style jsx>{`
        .active\\:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
    </>
  );
};

export default CurrentBill;

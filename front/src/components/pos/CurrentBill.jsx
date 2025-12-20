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
}) => {
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const calculateCurrentRoundTotal = () => {
    return currentRoundItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  };

  const handleCloseWithReceipt = () => {
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
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 sticky top-4">
        <h2 className="text-xl font-bold mb-4 text-pink-500">Current Bill</h2>

        {bill ? (
          <>
            {/* Bill Header */}
            <div className="mb-4 pb-4 border-b border-gray-700">
              <div className="text-sm  text-gray-400">Customer</div>
              <div className="font-semibold text-lg">{bill.customer_name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(bill.created_at).toLocaleString()}
              </div>
              <div className="text-sm text-pink-500 mt-2">
                {bill?.rounds.length} rounds added
              </div>
            </div>

            {/* Current Round Items */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-purple-400 mb-2">
                Current Round {bill.rounds.length + 1}
              </h3>

              {currentRoundItems.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentRoundItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-purple-900 bg-opacity-30 p-2 rounded"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-sm">
                          {item.productName}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="p-1 bg-gray-600 rounded hover:bg-gray-500"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="p-1 bg-gray-600 rounded hover:bg-gray-500"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1 bg-red-600 rounded hover:bg-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="ml-4 font-semibold text-pink-500 w-20 text-right">
                        {item.price * item.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4 text-sm">
                  {" "}
                  No items in current round
                </div>
              )}

              {currentRoundItems.length > 0 && (
                <>
                  <div className="mt-3 pt-3 border-t border-purple-500">
                    <div className="flex justify-between text-sm">
                      <span>Round Total:</span>
                      <span className="font-semibold">
                        {currentRoundTotal} KES
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onAddRound}
                    className="mt-3 w-full py-2 rounded-lg font-semibold bg-linear-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 flex items-center justify-center"
                  >
                    <Check size={18} className="mr-1" />
                    Add Round to Bill
                  </button>
                </>
              )}
            </div>

            {/* Bill summary */}
            {bill?.rounds.length > 0 && (
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">
                  Bill Summary
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {bill.rounds.map((round, idx) => (
                    <div key={idx} className="bg-gray-700 p-2 rounded">
                      <div className="text-xs text-gray-400 mb-1">
                        Round {round.round_number} -{" "}
                        {new Date(round.added_at).toLocaleTimeString()}
                      </div>
                      {round.round_items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="flex justify-between text-sm"
                        >
                          <span>
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="text-pink-500">
                            {item.price * item.quantity} KES
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="space-y-2 bg-gray-700 p-3 rounded">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      {billTotals.subtotal} KES
                    </span>
                  </div>
                  {/* <div className="flex justify-between text-sm text-gray-400">
                    <span>Tax (16%):</span>
                    <span>{billTotals.tax.toFixed(2)} KES</span>
                  </div> */}
                  <div className="flex justify-between text-xl font-bold text-pink-500">
                    <span>TOTAL:</span>
                    <span>{billTotals.total.toFixed(2)} KES</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={handleCloseWithReceipt}
                    className="py-3 bg-linear-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 flex items-center justify-center text-sm"
                  >
                    <Receipt size={16} className="mr-1" />
                    Close & Receipt
                  </button>
                  <button
                    onClick={onCloseBill}
                    className="py-3 bg-linear-to-r from-blue-600 to-indigo-600 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center text-sm"
                  >
                    <X size={16} className="mr-1" />
                    Close Bill
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <AlertCircle size={48} className="mx-auto mb-2 opacity-50" />
            <p>No active bill</p>
            <p className="text-sm mt-1">Start new bill or select open bill</p>
          </div>
        )}
      </div>

      {showReceiptModal && bill && (
        <ReceiptModal bill={bill} onClose={() => setShowReceiptModal(false)} />
      )}
    </>
  );
};

export default CurrentBill;

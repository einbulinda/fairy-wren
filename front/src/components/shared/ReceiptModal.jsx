import { useState } from "react";
import { X, DollarSign, Printer } from "lucide-react";
import { calculateBillTotals } from "../../utils/calculations";
import PaymentModal from "./PaymentModal";

const ReceiptModal = ({ bill, onClose }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const totals = calculateBillTotals(bill);

  const handleMarkAsPaid = () => {
    setShowPaymentModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
        <div
          className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl border-2 border-pink-500 max-h-[95vh] sm:max-h-[90vh]
        overflow-hidden flex flex-col animate-slide-up"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-700 shrink-0">
            <h3 className="text-xl sm:text-2xl font-bold text-pink-500">
              Final Receipt
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors hidden sm:block"
                title="Print Receipt"
              >
                <Printer size={20} className="text-gray-400 hover:text-white" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Close Modal"
              >
                <X size={24} className="text-gray-400 hover:text-white" />
              </button>
            </div>
          </div>

          {/* Receipt Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="bg-gray-900 p-4 sm:p-6 rounded-lg">
              {/* Start: Receipt header */}
              <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-purple-500">
                  FAIRY WREN
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">
                  Hasher's Club
                </p>
              </div>
              {/* End: Receipt header */}

              {/* Start: Bill info */}
              <div className="border-t border-b border-gray-700 py-3 sm:py-4 mb-4">
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div className="text-gray-400">Bill #:</div>
                  <div className="text-right font-mono">
                    {bill.id.slice(0, 8)}
                  </div>
                  <div className="text-gray-400">Customer:</div>
                  <div className="text-right font-semibold truncate">
                    {bill.customer_name}
                  </div>
                  <div className="text-gray-400">Served By:</div>
                  <div className="text-right truncate">
                    {bill.waitress_name}
                  </div>
                  <div className="text-gray-400">Date:</div>
                  <div className="text-right text-xs sm:text-sm">
                    {new Date(bill.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-gray-400">Time:</div>
                  <div className="text-right text-xs sm:text-sm">
                    {new Date(bill.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
              {/* End: Bill info */}

              {/* Start: Items by round */}
              <div className="space-y-3 sm:space-y-4 mb-4">
                {bill.rounds.map((round, idx) => (
                  <div key={idx} className="border-b border-gray-700 pb-3">
                    <div className="text-xs text-purple-400 mb-2 font-medium">
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
                          <span className="flex-1 truncate">
                            <span className="font-semibold text-pink-400">
                              {" "}
                              {item.quantity} x{" "}
                            </span>
                            {item.product_name}
                          </span>
                          <span className="font-semibold whitespace-nowrap">
                            KSh. {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* End: Items by round */}

              {/* Start: Totals */}
              <div className="border-t border-gray-700 pt-3 sm:pt-4 space-y-2">
                <div className="flex justify-between text-sm sm:text-lg">
                  <span className="text-gray-300">Subtotal:</span>
                  <span className="font-semibold">
                    KSh. {totals.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-lg sm:text-2xl font-bold text-pink-500 border-t border-gray-700 pt-2 sm:pt-3">
                  <span>TOTAL:</span>
                  <span>Ksh. {totals.total.toLocaleString()}</span>
                </div>
              </div>
              {/* End: Totals */}

              {/* Start: Footer */}
              <div className="text-center mt-4 sm:mt-6 text-xs text-gray-500 space-y-1">
                <p>Thank you for visiting!</p>
                <p>Please come again</p>
                <p className="text-[10px] mt-2">Bill ID: {bill.id}</p>
              </div>
              {/* End: Footer */}
            </div>
          </div>

          {/* Action Buttons - Fixed at the bottom */}
          <div className="p-4 sm:p-6 border-t border-gray-700 shrink-0 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
            <button
              onClick={handlePrint}
              className="w-full sm:flex-1 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center transition-all active:scale-95 text-sm sm:text-base sm:hidden"
            >
              <Printer size={18} className="mr-2" /> Print Receipt
            </button>
            <button
              onClick={handleMarkAsPaid}
              className="w-full sm:flex-1 py-2.5 sm:py-3 bg-linear-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 flex items-center justify-center transition-all active:scale-95 text-sm sm:text-base"
            >
              <DollarSign size={20} className="mr-2" />
              Mark as Paid
            </button>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          totals={totals}
          billId={bill.id}
          onClose={onClose}
          onCloseModal={() => setShowPaymentModal(false)}
        />
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .bg-gray-900,
          .bg-gray-900 * {
            visibility: visible;
          }
          .bg-gray-900 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </>
  );
};

export default ReceiptModal;

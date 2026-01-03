import { X } from "lucide-react";
import { calculateBillTotals } from "../../utils/calculations";

const OpenBillsModal = ({ bills, onSelectBill, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-gray-800 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl border-2 border-pink-500 max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-700 shrink-0">
          <h3 className="text-xl sm:text-2xl font-bold text-pink-500">
            Open Bills{" "}
            {bills.length > 0 && (
              <span className="ml-2 text-sm sm:text-base text-gray-400 font-normal">
                ({bills.length})
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={24} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Bills List */}
        <div className="overflow-y-auto space-y-3 flex-1 p-4 sm:p-6">
          {bills.map((bill) => {
            const totals = calculateBillTotals(bill);
            return (
              <div
                key={bill.id}
                onClick={() => onSelectBill(bill)}
                className="bg-gray-700 p-3 sm:p-4 rounded-lg border-2 border-purple-500 hover:border-pink-500 cursor-pointer transition-all hover:shadow-lg hover:shadow-pink-500/20 active:scale-98"
              >
                <div className="flex justify-between items-start gap-3">
                  {/* Left side - Bill info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base sm:text-lg font-bold text-white truncate">
                      {bill.customer_name}
                    </h4>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <p className="text-xs sm:text-sm text-gray-400">
                        Bill #{bill?.id.slice(0, 8)}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-400">
                        {new Date(bill.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">
                      {bill.rounds.length} round
                      {bill.rounds.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Right side - Status and Total */}
                  <div className="text-right shrink-0">
                    <div className="px-2 sm:px-3 py-1 bg-green-600 rounded-full text-xs sm:text-sm font-semibold mb-2 whitespace-nowrap">
                      Open
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-pink-500  whitespace-nowrap">
                      KSh. {totals.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {bills.length === 0 && (
            <div className="text-gray-500 text-center py-12 sm:py-16">
              <p className="text-base sm:text-lg">No open bills available.</p>
            </div>
          )}
        </div>

        {/* Footer - Close button on mobile */}
        <div className="sm:hidden p-4 border-t border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>

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
        .active\\:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};

export default OpenBillsModal;

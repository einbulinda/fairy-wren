import { X, Banknote, Smartphone } from "lucide-react";

const PaymentModal = ({
  isOpen,
  onClose,
  onConfirm,
  billTotals,
  canAccessConfirm,
  paymentMethod,
  setPaymentMethod,
  loading,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-gray-900/95 backdrop-blur-md border-2 border-purple-500/30 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-purple-500/20">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-purple-500/20 shrink-0">
          <h3 className="text-2xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Payment Details
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={24} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-2 font-medium">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("cash")}
                disabled={loading}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === "cash"
                    ? "border-pink-500 bg-pink-500/10"
                    : "border-gray-600 hover:border-gray-500"
                } disabled:opacity-50`}
              >
                <Banknote
                  size={24}
                  className={
                    paymentMethod === "cash" ? "text-pink-500" : "text-gray-400"
                  }
                />
                <span
                  className={`font-semibold ${
                    paymentMethod === "cash" ? "text-pink-500" : "text-gray-300"
                  }`}
                >
                  Cash
                </span>
              </button>

              <button
                onClick={() => setPaymentMethod("mpesa")}
                disabled={loading}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === "mpesa"
                    ? "border-green-500 bg-green-500/10"
                    : "border-gray-600 hover:border-gray-500"
                } disabled:opacity-50`}
              >
                <Smartphone
                  size={24}
                  className={
                    paymentMethod === "mpesa"
                      ? "text-green-500"
                      : "text-gray-400"
                  }
                />
                <span
                  className={`font-semibold ${
                    paymentMethod === "mpesa"
                      ? "text-green-500"
                      : "text-gray-300"
                  }`}
                >
                  M-PESA
                </span>
              </button>
            </div>
          </div>

          {paymentMethod === "mpesa" && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-sm">
              <p className="font-semibold text-green-400 mb-2">
                M-PESA Instructions:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-300">
                <li>Go to M-PESA menu on your phone</li>
                <li>Select Lipa na M-PESA &gt; Pay Bill</li>
                <li>
                  Enter Business Number:{" "}
                  <span className="font-bold">522522</span>
                </li>
                <li>
                  Enter Account: <span className="font-bold">8040662</span>
                </li>
              </ol>
            </div>
          )}

          <div className="border-t border-purple-500/20 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg text-gray-300 font-medium">
                Total Bill Amount:
              </span>
              <span className="text-3xl font-bold text-pink-500">
                KSh {billTotals.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-purple-500/20 shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3.5 bg-linear-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/30 border border-green-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : canAccessConfirm ? (
                "Confirm Payment"
              ) : (
                "Bill Paid"
              )}
            </button>

            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3.5 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

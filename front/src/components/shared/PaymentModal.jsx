import { useState } from "react";
import toast from "react-hot-toast";
import { useBills } from "../../hooks/useBills";
import { USER_ROLES } from "../../utils/constants";
import { useAuth } from "../../hooks/useAuth";
import { X, CreditCard, Smartphone, Banknote } from "lucide-react";

const PaymentModal = ({ totals, billId, onCloseModal, onClose }) => {
  const {
    confirmPayment: confirmPaymentAPI,
    payBill: markBillAsPaid,
    reload,
  } = useBills();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [mpesaCode, setMpesaCode] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmPayment = async () => {
    if (paymentMethod === "mpesa" && !mpesaCode.trim()) {
      toast.error("Please enter MPESA code");
      return;
    }

    setLoading(true);
    try {
      if (user.role === USER_ROLES.BARTENDER) {
        //   Bartender auto confirms bills
        const response = await confirmPaymentAPI({
          billId,
          paymentMethod,
          mpesaCode,
        });
        if (response) toast.success("Bill completed and auto-confirmed!");
      } else {
        // Waitress needs bartender confirmation
        const billDtls = {
          paymentMethod,
          mpesaCode: paymentMethod === "mpesa" ? mpesaCode : null,
          amount: totals,
        };

        const response = await markBillAsPaid(billId, billDtls);
        if (response) {
          toast.success(
            "Bill marked as paid! Awaiting bartender confirmation."
          );
          onCloseModal();
        }
      }

      onClose();
    } catch (error) {
      toast.error("Failed to process payment");
      console.error(error);
    } finally {
      reload();
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-60">
      <div className="bg-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-w-md border-2 border-pink-500 max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-700 shrink-0">
          <h3 className="text-xl sm:text-2xl font-bold text-pink-500 flex items-center gap-2">
            Payment Details
          </h3>
          <button
            onClick={onCloseModal}
            disabled={loading}
            aria-label="Close modal"
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={24} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Payment Method Selection */}
          <div>
            <label className="block text-xs sm:text-sm text-gray-400 mb-2 font-medium">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={() => setPaymentMethod("cash")}
                disabled={loading}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === "cash"
                    ? "border-pink-500 bg-pink-500/10"
                    : "border-gray-600 hover:border-gray-500"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Banknote
                  size={24}
                  className={
                    paymentMethod === "cash" ? "text-pink-500" : "text-gray-400"
                  }
                />
                <span
                  className={`text-sm sm:text-base font-semibold ${
                    paymentMethod === "cash" ? "text-pink-500" : "text-gray-300"
                  }`}
                >
                  Cash
                </span>
              </button>

              <button
                onClick={() => setPaymentMethod("mpesa")}
                disabled={loading}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === "mpesa"
                    ? "border-green-500 bg-green-500/10"
                    : "border-gray-600 hover:border-gray-500"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                  className={`text-sm sm:text-base font-semibold ${
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

          {/* MPESA Code Input */}
          {paymentMethod === "mpesa" && (
            <div className="animate-fade-in">
              <label className="block text-xs sm:text-sm text-gray-400 mb-2 font-medium">
                M-PESA Transaction Code
              </label>
              <input
                type="text"
                value={mpesaCode}
                onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                placeholder="e.g. SH12ABC34D"
                autoCapitalize="characters"
                disabled={loading}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 border-2 border-purple-500 rounded-lg text-white uppercase tracking-wider text-sm sm:text-base focus:outline-none focus:border-pink-500 placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Enter the M-PESA confirmation code received via SMS
              </p>
            </div>
          )}

          {/* Payment Instructions */}
          {paymentMethod === "mpesa" && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 sm:p-4 text-xs sm:text-sm">
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
                  Enter Account: <span className="font-bold">FAIRYWREN</span>
                </li>
                <li>Enter amount and confirm</li>
                <li>Share the confirmation code above</li>
              </ol>
            </div>
          )}

          {/* Total Amount */}
          <div className="border-t border-gray-700 pt-3 sm:pt-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="text-base sm:text-lg text-gray-300 font-medium">
                Total Bill Amount:
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-pink-500">
                KSh. {totals.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}

        <div className="p-4 sm:p-6 border-t border-gray-700 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => confirmPayment(billId)}
              disabled={
                loading || (paymentMethod === "mpesa" && !mpesaCode.trim())
              }
              className="flex-1 py-3 sm:py-3.5 bg-linear-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 text-sm sm:text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Confirm Payment"
              )}
            </button>

            <button
              onClick={onCloseModal}
              disabled={loading}
              className="flex-1 py-3 sm:py-3.5 bg-gray-600 rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 text-sm sm:text-base"
            >
              Cancel
            </button>
          </div>
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

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PaymentModal;

import { useState, useMemo } from "react";
import { X, Banknote, Smartphone, Plus, Trash2 } from "lucide-react";

const PaymentModal = ({
  isOpen,
  onClose,
  onSubmitPayments,
  billTotal,
  balanceDue,
  amountPaid,
  loading,
  canAccessConfirm,
}) => {
  const [paymentLines, setPaymentLines] = useState([]);
  const [currentAmount, setCurrentAmount] = useState("");
  const [currentMethod, setCurrentMethod] = useState("cash");

  const linesTotal = useMemo(
    () => paymentLines.reduce((sum, l) => sum + l.amount, 0),
    [paymentLines],
  );

  const remaining = balanceDue - linesTotal;

  if (!isOpen) return null;

  const handleAddLine = () => {
    const amount = parseFloat(currentAmount);
    if (!amount || amount <= 0) return;
    if (amount > remaining + 0.01) return; // small float tolerance

    setPaymentLines([...paymentLines, { amount, method: currentMethod }]);
    setCurrentAmount("");
    setCurrentMethod("cash");
  };

  const handleRemoveLine = (index) => {
    setPaymentLines(paymentLines.filter((_, i) => i !== index));
  };

  const handlePayFull = () => {
    setPaymentLines([{ amount: balanceDue, method: currentMethod }]);
    setCurrentAmount("");
  };

  const handleSubmit = () => {
    if (paymentLines.length === 0) return;
    onSubmitPayments(paymentLines);
  };

  const canAddLine = (() => {
    const amount = parseFloat(currentAmount);
    return amount > 0 && amount <= remaining + 0.01;
  })();

  const canSubmit = paymentLines.length > 0 && !loading;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-gray-900/95 backdrop-blur-md border-2 border-purple-500/30 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-purple-500/20">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-purple-500/20 shrink-0">
          <h3 className="text-2xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Payment
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
          {/* Bill Summary */}
          <div className="bg-gray-800/40 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Bill Total</span>
              <span className="text-gray-200 font-mono">
                KSh {billTotal.toLocaleString()}
              </span>
            </div>
            {amountPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Already Paid</span>
                <span className="text-green-400 font-mono">
                  -KSh {amountPaid.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-purple-500/20 pt-2">
              <span className="text-gray-200">Balance Due</span>
              <span className="text-pink-500 font-mono">
                KSh {balanceDue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Added Payment Lines */}
          {paymentLines.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm text-gray-400 font-medium">
                Payments to Submit
              </label>
              {paymentLines.map((line, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-800/40 rounded-lg px-4 py-3 border border-purple-500/10"
                >
                  <div className="flex items-center gap-3">
                    {line.method === "cash" ? (
                      <Banknote size={18} className="text-pink-400" />
                    ) : (
                      <Smartphone size={18} className="text-green-400" />
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${
                        line.method === "cash"
                          ? "bg-pink-500/20 text-pink-300"
                          : "bg-green-500/20 text-green-300"
                      }`}
                    >
                      {line.method === "cash" ? "Cash" : "M-PESA"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white">
                      KSh {line.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleRemoveLine(i)}
                      disabled={loading}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Lines Total */}
              <div className="flex justify-between text-sm px-4 pt-1">
                <span className="text-gray-400">Lines Total</span>
                <span className="text-gray-200 font-mono font-semibold">
                  KSh {linesTotal.toLocaleString()}
                </span>
              </div>
              {remaining > 0.01 && (
                <div className="flex justify-between text-sm px-4">
                  <span className="text-gray-400">Remaining</span>
                  <span className="text-yellow-400 font-mono font-semibold">
                    KSh {remaining.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Add Payment Line */}
          {remaining > 0.01 && (
            <div className="space-y-3">
              <label className="block text-sm text-gray-400 font-medium">
                {paymentLines.length > 0
                  ? "Add Another Payment"
                  : "Add Payment"}
              </label>

              {/* Method Selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCurrentMethod("cash")}
                  disabled={loading}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                    currentMethod === "cash"
                      ? "border-pink-500 bg-pink-500/10"
                      : "border-gray-600 hover:border-gray-500"
                  } disabled:opacity-50`}
                >
                  <Banknote
                    size={20}
                    className={
                      currentMethod === "cash"
                        ? "text-pink-500"
                        : "text-gray-400"
                    }
                  />
                  <span
                    className={`font-semibold text-sm ${
                      currentMethod === "cash"
                        ? "text-pink-500"
                        : "text-gray-300"
                    }`}
                  >
                    Cash
                  </span>
                </button>

                <button
                  onClick={() => setCurrentMethod("mpesa")}
                  disabled={loading}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                    currentMethod === "mpesa"
                      ? "border-green-500 bg-green-500/10"
                      : "border-gray-600 hover:border-gray-500"
                  } disabled:opacity-50`}
                >
                  <Smartphone
                    size={20}
                    className={
                      currentMethod === "mpesa"
                        ? "text-green-500"
                        : "text-gray-400"
                    }
                  />
                  <span
                    className={`font-semibold text-sm ${
                      currentMethod === "mpesa"
                        ? "text-green-500"
                        : "text-gray-300"
                    }`}
                  >
                    M-PESA
                  </span>
                </button>
              </div>

              {currentMethod === "mpesa" && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-green-400 mb-1">
                    M-PESA Instructions:
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-gray-300">
                    <li>Go to M-PESA &gt; Lipa na M-PESA &gt; Pay Bill</li>
                    <li>
                      Business: <span className="font-bold">522522</span> |
                      Account: <span className="font-bold">8040662</span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Amount Input + Add Button */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    KSh
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={currentAmount}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d*$/.test(v)) setCurrentAmount(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canAddLine) handleAddLine();
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder={remaining.toFixed(0)}
                    disabled={loading}
                    className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-800/60 border-2 border-purple-500/30 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-lg font-mono disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handleAddLine}
                  disabled={!canAddLine || loading}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>

              {/* Quick Pay Full */}
              {paymentLines.length === 0 && (
                <button
                  onClick={handlePayFull}
                  disabled={loading}
                  className="w-full py-2.5 text-sm bg-gray-800/40 hover:bg-gray-800/60 border border-purple-500/20 rounded-lg text-purple-300 font-medium transition-all disabled:opacity-50"
                >
                  Pay Full Balance (KSh {balanceDue.toLocaleString()})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-purple-500/20 shrink-0">
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
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
                `Confirm Payment${paymentLines.length > 1 ? "s" : ""}`
              ) : (
                `Submit Payment${paymentLines.length > 1 ? "s" : ""}`
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

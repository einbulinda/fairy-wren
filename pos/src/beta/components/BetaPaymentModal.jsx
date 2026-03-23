import React, { useState, useCallback, useMemo, useEffect } from "react";
import { X, Banknote, Smartphone } from "lucide-react";
import { PAYMENT_METHODS } from "@/utils/constants";
import { formatKES } from "@/utils/formatters";
import toast from "react-hot-toast";

// Only Cash and M-Pesa for nightclub operations
const AVAILABLE_METHODS = [PAYMENT_METHODS.CASH, PAYMENT_METHODS.MPESA];

const BetaPaymentModal = ({
  isOpen,
  onClose,
  onSubmitPayments,
  billTotal,
  balanceDue,
  amountPaid,
  canAccessConfirm,
  loading,
}) => {
  const [payments, setPayments] = useState([
    { method: PAYMENT_METHODS.CASH, amount: "" },
  ]);
  const [activeMethod, setActiveMethod] = useState(PAYMENT_METHODS.CASH);

  const remainingDue = useMemo(() => {
    const totalPaid = payments.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0
    );
    return Math.max(0, billTotal - totalPaid);
  }, [payments, billTotal]);

  const changeDue = useMemo(() => {
    const totalPaid = payments.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0
    );
    return Math.max(0, totalPaid - billTotal);
  }, [payments, billTotal]);

  const updatePaymentAmount = (index, amount) => {
    setPayments((prev) =>
      prev.map((p, i) => (i === index ? { ...p, amount } : p))
    );
  };

  const addPaymentMethod = (method) => {
    setPayments((prev) => [...prev, { method, amount: "" }]);
    setActiveMethod(method);
  };

  const removePayment = (index) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickAmount = (amount) => {
    const currentAmount = parseFloat(payments[0]?.amount) || 0;
    updatePaymentAmount(0, (currentAmount + amount).toString());
  };

  const handleSubmit = useCallback(() => {
    const validPayments = payments
      .filter((p) => parseFloat(p.amount) > 0)
      .map((p) => ({ method: p.method, amount: parseFloat(p.amount) }));

    if (validPayments.length === 0) {
      toast.error("Enter payment amount");
      return;
    }

    const totalPaying = validPayments.reduce((s, p) => s + p.amount, 0);
    if (totalPaying <= 0) {
      toast.error("Enter valid amount");
      return;
    }

    onSubmitPayments(validPayments);
  }, [payments, onSubmitPayments]);

  const methodIcons = {
    [PAYMENT_METHODS.CASH]: Banknote,
    [PAYMENT_METHODS.MPESA]: Smartphone,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className="w-full lg:max-w-md bg-slate-900 rounded-t-2xl lg:rounded-2xl border border-slate-700/50 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Payment</h2>
            <p className="text-sm text-gray-400">Total: {formatKES(billTotal)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Payment Methods */}
        <div className="p-4 border-b border-slate-700/20">
          <div className="flex gap-2">
            {AVAILABLE_METHODS.map((method) => {
              const Icon = methodIcons[method] || Banknote;
              const isActive = payments.some((p) => p.method === method);
              return (
                <button
                  key={method}
                  onClick={() =>
                    isActive
                      ? setActiveMethod(method)
                      : addPaymentMethod(method)
                  }
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                    isActive
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                      : "bg-slate-800/50 text-gray-400 hover:bg-slate-800"
                  }`}
                >
                  <Icon size={18} />
                  {method}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Input */}
        <div className="p-4 space-y-3">
          {payments.map((payment, index) => {
            const Icon = methodIcons[payment.method] || Banknote;
            return (
              <div
                key={index}
                className={`p-3 rounded-xl border transition-all ${
                  activeMethod === payment.method
                    ? "border-pink-500/50 bg-pink-500/5"
                    : "border-slate-700/30 bg-slate-800/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className="text-pink-400" />
                  <span className="text-sm font-medium text-gray-300">
                    {payment.method}
                  </span>
                  {payments.length > 1 && (
                    <button
                      onClick={() => removePayment(index)}
                      className="ml-auto text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                    KSh
                  </span>
                  <input
                    type="number"
                    value={payment.amount}
                    onChange={(e) => updatePaymentAmount(index, e.target.value)}
                    onFocus={() => setActiveMethod(payment.method)}
                    placeholder="0"
                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-2xl font-bold text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50"
                    autoFocus={index === 0}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Amounts */}
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[100, 500, 1000, 2000, 5000].map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/30 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-all whitespace-nowrap"
              >
                +{amount}
              </button>
            ))}
          </div>
        </div>

        {/* Summary & Actions */}
        <div className="p-4 border-t border-slate-700/30 bg-slate-900/50 mt-auto">
          {/* Summary */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Remaining Due</span>
              <span
                className={`font-bold ${
                  remainingDue > 0 ? "text-white" : "text-emerald-400"
                }`}
              >
                {formatKES(remainingDue)}
              </span>
            </div>
            {changeDue > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Change Due</span>
                <span className="font-bold text-emerald-400">
                  {formatKES(changeDue)}
                </span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 rounded-xl font-semibold transition-all"
            >
              {loading
                ? "Processing..."
                : changeDue > 0
                ? `Pay ${formatKES(billTotal + changeDue)}`
                : `Pay ${formatKES(remainingDue || billTotal)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetaPaymentModal;

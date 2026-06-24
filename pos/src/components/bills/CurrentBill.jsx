import {
  Plus,
  Minus,
  Trash2,
  Check,
  AlertCircle,
  X,
  Receipt,
  FileText,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  PackagePlus,
  AlertTriangle,
  Loader2,
  ArrowLeftRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  calculateBillTotals,
  calculateBillPaymentInfo,
  itemLineTotal,
} from "../../utils/calculations";

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
  onExchangeItem,
  isAddingRound = false,
  stockWarnings = {},
}) => {
  const [previousOrdersExpanded, setPreviousOrdersExpanded] = useState(false);

  const calculateCurrentRoundTotal = () => {
    return currentRoundItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  };

  const currentRoundTotal = calculateCurrentRoundTotal();
  const billTotals = calculateBillTotals(bill);
  const paymentInfo = bill ? calculateBillPaymentInfo(bill) : null;

  const hasRecentItems = useMemo(() => {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    return (
      bill?.rounds?.some(
        (r) =>
          new Date(r.created_at) >= sixHoursAgo &&
          (r.round_items || []).some((i) => !i.is_return && i.inventory_posted),
      ) ?? false
    );
  }, [bill]);

  const canVoid = useMemo(() => {
    if (!bill) return false;
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return new Date(bill.created_at) >= twentyFourHoursAgo;
  }, [bill]);
  const hasStockWarnings = Object.keys(stockWarnings).length > 0;
  const hasCriticalStockError = Object.values(stockWarnings).some(
    (w) => w?.severity === "error",
  );

  return (
    <div className="lg:col-span-1 flex flex-col h-full">
      <div className="bg-linear-to-br from-gray-900/60 to-gray-800/60 backdrop-blur-md rounded-xl border border-purple-500/20 p-5 shadow-xl flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
            <Receipt size={20} />
            Current Bill
          </h3>
          {bill && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700/50 rounded"
              aria-label="Close bill"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Scrollable Content Area */}
        {bill ? (
          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Customer Info */}
            <div className="bg-linear-to-r from-purple-900/30 to-pink-900/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/30">
              <p className="text-xs text-purple-300 font-semibold mb-1 uppercase tracking-wide">
                Customer
              </p>
              <p className="text-lg font-bold text-white">
                {bill.customer_name}
              </p>
              {bill.customer_account && (
                <p className="text-xs text-purple-400 mt-0.5">
                  Account: {bill.customer_account.name}
                </p>
              )}
            </div>

            {/* ⚠️ STOCK WARNINGS BANNER */}
            {hasStockWarnings && (
              <div
                className={`rounded-lg p-3 border ${
                  hasCriticalStockError
                    ? "bg-red-900/20 border-red-500/30"
                    : "bg-amber-900/20 border-amber-500/30"
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    size={20}
                    className={`shrink-0 mt-0.5 ${
                      hasCriticalStockError ? "text-red-400" : "text-amber-400"
                    }`}
                  />
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold mb-1 ${
                        hasCriticalStockError
                          ? "text-red-300"
                          : "text-amber-300"
                      }`}
                    >
                      {hasCriticalStockError
                        ? "Stock Error"
                        : "Low Stock Alert"}
                    </p>
                    <ul className="text-xs space-y-1">
                      {Object.entries(stockWarnings).map(
                        ([itemId, warning]) => {
                          const item = currentRoundItems.find(
                            (i) => i.id === itemId,
                          );
                          if (!item) return null;
                          return (
                            <li
                              key={itemId}
                              className={`flex items-center gap-1 ${
                                warning.severity === "error"
                                  ? "text-red-200"
                                  : "text-amber-200"
                              }`}
                            >
                              • {item.productName}: {warning.message}
                            </li>
                          );
                        },
                      )}
                    </ul>
                    {hasCriticalStockError && (
                      <p className="text-xs text-red-200 mt-2">
                        ⚠️ Please adjust quantities before adding to bill
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Previous Rounds - Collapsible */}
            {bill.rounds && bill.rounds.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() =>
                    setPreviousOrdersExpanded(!previousOrdersExpanded)
                  }
                  className="w-full flex items-center justify-between text-xs text-purple-300 font-semibold uppercase tracking-wider hover:text-purple-200 transition-colors py-1"
                  aria-expanded={previousOrdersExpanded}
                  aria-controls="previous-orders-list"
                >
                  <span>Previous Orders ({bill.rounds.length})</span>
                  {previousOrdersExpanded ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>

                {previousOrdersExpanded && (
                  <div
                    id="previous-orders-list"
                    className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent"
                  >
                    {bill.rounds.map((round) => (
                      <div
                        key={round.id || round.optimistic?.id}
                        className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-3 border border-purple-500/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-purple-400 font-semibold">
                            Order #{round.round_number || "Pending"}
                            {round.optimistic && (
                              <span className="ml-1 text-purple-500/70 text-[10px]">
                                (Adding...)
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono font-bold text-pink-400">
                            KSh{" "}
                            {(round.items || round.round_items || [])
                              .reduce(
                                (sum, item) => sum + itemLineTotal(item),
                                0,
                              )
                              .toFixed(2)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {(round.items || round.round_items || []).map(
                            (item) => (
                              <div
                                key={item.id}
                                className={`flex justify-between text-xs ${item.is_return ? "opacity-70" : ""}`}
                              >
                                <span
                                  className={
                                    item.is_return
                                      ? "text-red-400 line-through"
                                      : "text-gray-300"
                                  }
                                >
                                  {item.quantity}x{" "}
                                  {item.name || item.product?.name}
                                  {item.is_return && " (RETURN)"}
                                </span>
                                <span
                                  className={`font-mono ${item.is_return ? "text-red-400" : "text-gray-400"}`}
                                >
                                  {item.is_return ? "-" : ""}KSh{" "}
                                  {(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Current Round Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider">
                  Current Round
                </p>
                {currentRoundItems.length > 0 && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      hasCriticalStockError
                        ? "bg-red-500/20 text-red-300"
                        : "bg-purple-500/20 text-purple-300"
                    }`}
                  >
                    {currentRoundItems.length}{" "}
                    {currentRoundItems.length === 1 ? "item" : "items"}
                  </span>
                )}
              </div>

              {currentRoundItems.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                  {currentRoundItems.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-linear-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-lg p-3 border transition-colors ${
                        stockWarnings[item.id]
                          ? stockWarnings[item.id].severity === "error"
                            ? "border-red-500/40 bg-red-900/10"
                            : "border-amber-500/40 bg-amber-900/10"
                          : "border-purple-500/20 hover:border-purple-500/40"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <p
                            className="font-medium text-white text-sm truncate"
                            title={item.productName}
                          >
                            {item.productName}
                          </p>
                          <p className="text-xs text-purple-300">
                            KSh {Number(item.price).toFixed(2)} each
                          </p>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 rounded transition-all shrink-0"
                          aria-label={`Remove ${item.productName}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* ⚠️ ITEM-LEVEL STOCK WARNING */}
                      {stockWarnings[item.id] && (
                        <div
                          className={`text-xs mb-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${
                            stockWarnings[item.id].severity === "error"
                              ? "bg-red-500/15 text-red-300 border border-red-500/30"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>{stockWarnings[item.id].message}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-gray-900/40 rounded-lg p-0.5">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            disabled={item.quantity <= 1}
                            className={`p-1.5 rounded transition-colors ${
                              item.quantity <= 1
                                ? "text-gray-600 cursor-not-allowed"
                                : "text-purple-300 hover:bg-purple-500/20"
                            }`}
                            aria-label={`Decrease ${item.productName} quantity`}
                            aria-disabled={item.quantity <= 1}
                          >
                            <Minus size={13} />
                          </button>
                          <span className="text-sm font-bold text-white px-3 min-w-7 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-1.5 rounded hover:bg-purple-500/20 text-purple-300 transition-colors"
                            aria-label={`Increase ${item.productName} quantity`}
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
                <div className="text-center py-8 bg-gray-900/20 rounded-lg border border-dashed border-purple-500/20">
                  <ShoppingCart
                    className="mx-auto mb-3 text-gray-500"
                    size={32}
                  />
                  <p className="text-sm font-medium text-gray-400 mb-1">
                    No items yet
                  </p>
                  <p className="text-xs text-gray-500">
                    Add products to start the order
                  </p>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-3 border-t border-purple-500/20">
              {billTotals && billTotals.subtotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Previous Orders:</span>
                  <span className="font-mono font-semibold text-white">
                    KSh {billTotals.subtotal.toFixed(2)}
                  </span>
                </div>
              )}
              {currentRoundTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current Order:</span>
                  <span className="font-mono font-semibold text-white">
                    KSh {currentRoundTotal.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-purple-500/10">
                <span className="text-base font-bold text-purple-300">
                  Total:
                </span>
                <span className="text-2xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  KSh{" "}
                  {((billTotals?.subtotal || 0) + currentRoundTotal).toFixed(2)}
                </span>
              </div>

              {/* Payments Made */}
              {paymentInfo &&
                (paymentInfo.amountPaid > 0 ||
                  paymentInfo.pendingAmount > 0) && (
                  <div className="space-y-1.5 pt-2 border-t border-purple-500/10">
                    {paymentInfo.amountPaid > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-400">Paid:</span>
                        <span className="font-mono font-semibold text-green-400">
                          -KSh {paymentInfo.amountPaid.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {paymentInfo.pendingAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-400">Pending:</span>
                        <span className="font-mono font-semibold text-yellow-400">
                          KSh {paymentInfo.pendingAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {/* Individual payment lines */}
                    {(bill.payments || [])
                      .filter(
                        (p) =>
                          p.status === "confirmed" || p.status === "pending",
                      )
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between text-xs pl-3"
                        >
                          <span
                            className={
                              p.status === "confirmed"
                                ? "text-green-500/70"
                                : "text-yellow-500/70"
                            }
                          >
                            {p.payment_type === "mpesa" ? "M-PESA" : "Cash"}
                            {p.status === "pending" && " (pending)"}
                          </span>
                          <span
                            className={`font-mono ${p.status === "confirmed" ? "text-green-500/70" : "text-yellow-500/70"}`}
                          >
                            KSh {parseFloat(p.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    <div className="flex justify-between items-center pt-1.5 border-t border-purple-500/10">
                      <span className="text-base font-bold text-pink-400">
                        Balance Due:
                      </span>
                      <span className="text-xl font-bold text-pink-400 font-mono">
                        KSh {paymentInfo.balanceDue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 flex-1 flex flex-col items-center justify-center">
            <div className="bg-gray-800/30 rounded-full p-6 mb-4">
              <Receipt size={48} className="mx-auto text-gray-600" />
            </div>
            <p className="font-semibold text-base text-gray-400 mb-2">
              No Active Bill
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Create a new sale or select an open bill
            </p>
            <div className="text-xs text-gray-600 bg-gray-800/20 px-4 py-2 rounded-lg border border-gray-700/30">
              💡 Tip: Click "New Bill" or "Open Bills" to start
            </div>
          </div>
        )}

        {/* Action Buttons - Fixed Footer */}
        {bill && (
          <div className="space-y-2.5 pt-4 mt-4 border-t border-purple-500/10 shrink-0">
            {/* Add Round Button */}
            {currentRoundItems.length > 0 && (
              <button
                onClick={onAddRound}
                disabled={isAddingRound || hasCriticalStockError}
                className={`w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg text-base touch-manipulation ${
                  isAddingRound || hasCriticalStockError
                    ? "bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30"
                    : "bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 shadow-purple-500/30"
                }`}
                title={
                  hasCriticalStockError
                    ? "Fix stock errors before adding round"
                    : isAddingRound
                      ? "Adding round..."
                      : "Add items to bill"
                }
                aria-busy={isAddingRound}
              >
                {isAddingRound ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Adding Round...
                  </>
                ) : (
                  <>
                    <PackagePlus size={20} />
                    Add Items To Bill
                  </>
                )}
              </button>
            )}

            {/* Payment Button */}
            {bill.rounds && bill.rounds.length > 0 && (
              <button
                onClick={onOpenPayment}
                disabled={currentRoundItems.length > 0}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg text-base touch-manipulation ${
                  currentRoundItems.length > 0
                    ? "bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30"
                    : "bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:scale-95 shadow-green-500/30"
                }`}
                title={
                  currentRoundItems.length > 0
                    ? "Add current round to bill before payment"
                    : "Process payment"
                }
              >
                <Check size={20} />
                {currentRoundItems.length > 0 ? "Add Items First" : "Payment"}
              </button>
            )}

            {/* View Receipt Button */}
            {bill.rounds && bill.rounds.length > 0 && (
              <button
                onClick={() => onShowReceipt(true)}
                className="w-full py-3 bg-gray-700/60 hover:bg-gray-600/60 active:scale-95 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm touch-manipulation border border-gray-600/30"
              >
                <FileText size={18} />
                View Receipt
              </button>
            )}

            {/* Exchange Item Button — only when there are posted items within last 6 hours */}
            {hasRecentItems && (
              <button
                onClick={onExchangeItem}
                className="w-full py-3 bg-amber-900/30 border-2 border-amber-500/30 hover:bg-amber-900/50 hover:border-amber-500/50 active:scale-95 text-amber-400 hover:text-amber-300 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm touch-manipulation"
              >
                <ArrowLeftRight size={18} />
                Exchange Item
              </button>
            )}

            {/* Void Bill Button — disabled after 24 hours */}
            <button
              onClick={canVoid ? onVoidBill : undefined}
              disabled={!canVoid}
              className={`w-full py-3 border-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm touch-manipulation ${
                canVoid
                  ? "bg-red-900/30 border-red-500/30 hover:bg-red-900/50 hover:border-red-500/50 active:scale-95 text-red-400 hover:text-red-300"
                  : "border-gray-700/30 bg-gray-800/20 text-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              <AlertCircle size={18} />
              Void Bill
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentBill;

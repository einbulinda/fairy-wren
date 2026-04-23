import { useState, useMemo } from "react";
import {
  X,
  ArrowLeftRight,
  Search,
  CheckCircle,
  Lock,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";

const STEPS = { SELECT_RETURN: 0, SELECT_REPLACEMENT: 1, ENTER_PIN: 2 };

const QtyControl = ({ value, min, max, onChange }) => (
  <div className="flex items-center gap-1">
    <button
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      className="w-7 h-7 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 disabled:opacity-30 flex items-center justify-center transition-colors"
    >
      <Minus size={12} />
    </button>
    <span className="w-8 text-center font-bold text-white text-sm">{value}</span>
    <button
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      className="w-7 h-7 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 disabled:opacity-30 flex items-center justify-center transition-colors"
    >
      <Plus size={12} />
    </button>
  </div>
);

const ExchangeModal = ({ bill, products, onExchange, onClose, loading }) => {
  const [step, setStep] = useState(STEPS.SELECT_RETURN);
  const [returnedItem, setReturnedItem] = useState(null);
  const [returnedQty, setReturnedQty] = useState(1);
  const [replacementProduct, setReplacementProduct] = useState(null);
  const [replacementQty, setReplacementQty] = useState(1);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [search, setSearch] = useState("");

  const sixHoursAgo = useMemo(() => new Date(Date.now() - 6 * 60 * 60 * 1000), []);

  const exchangeableItems = useMemo(() => {
    if (!bill?.rounds) return [];
    return bill.rounds
      .filter((r) => new Date(r.created_at) >= sixHoursAgo)
      .flatMap((r) =>
        (r.round_items || [])
          .filter((item) => !item.is_return)
          .map((item) => ({
            ...item,
            roundNumber: r.round_number,
            roundCreatedAt: r.created_at,
            productName: item.product?.name || "Unknown product",
            alreadyExchanged: item.is_exchanged || item.inventory_posted === false,
          }))
      );
  }, [bill, sixHoursAgo]);

  const eligibleProducts = useMemo(
    () =>
      products.filter(
        (p) => p.active !== false && (!p.track_inventory || p.current_stock > 0),
      ),
    [products],
  );

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return eligibleProducts.slice(0, 30);
    const q = search.toLowerCase();
    return eligibleProducts.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 30);
  }, [eligibleProducts, search]);

  const selectReturnItem = (item) => {
    setReturnedItem(item);
    setReturnedQty(1);
  };

  const advanceFromReturn = () => {
    if (!returnedItem) return;
    setStep(STEPS.SELECT_REPLACEMENT);
  };

  const selectReplacement = (p) => {
    setReplacementProduct(p);
    setReplacementQty(1);
  };

  const advanceFromReplacement = () => {
    if (!replacementProduct) return;
    setStep(STEPS.ENTER_PIN);
  };

  const handlePinDigit = (digit) => {
    if (pin.length < 6) setPin((p) => p + digit);
    setPinError("");
  };

  const handlePinDelete = () => setPin((p) => p.slice(0, -1));

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setPinError("PIN must be at least 4 digits");
      return;
    }
    await onExchange({
      returned_item_id: returnedItem.id,
      returned_quantity: returnedQty,
      replacement_product_id: replacementProduct.id,
      replacement_quantity: replacementQty,
      replacement_price: replacementProduct.price,
      authorizer_pin: pin,
    });
  };

  const goBack = () => {
    setStep((s) => s - 1);
    setPinError("");
    setPin("");
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-70">
      <div className="bg-gray-900/95 backdrop-blur-md border border-purple-500/30 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-purple-500/20 shrink-0">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={20} className="text-purple-400" />
            <h2 className="text-lg font-bold text-white">Exchange Item</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-purple-500/10 shrink-0">
          {["Return Item", "Replacement", "Authorize"].map((label, idx) => (
            <div key={idx} className="flex items-center gap-1 flex-1">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
                  idx < step
                    ? "bg-green-500 text-white"
                    : idx === step
                    ? "bg-purple-500 text-white"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {idx < step ? <CheckCircle size={14} /> : idx + 1}
              </div>
              <span
                className={`text-xs truncate ${
                  idx === step ? "text-purple-300 font-medium" : "text-gray-500"
                }`}
              >
                {label}
              </span>
              {idx < 2 && <ChevronRight size={12} className="text-gray-600 shrink-0" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* STEP 0: Select item to return + quantity */}
          {step === STEPS.SELECT_RETURN && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                Select an item from this bill to return (sold in the last 6 hours):
              </p>
              {exchangeableItems.length === 0 ? (
                <div className="text-center py-8 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                  <AlertTriangle size={28} className="mx-auto mb-2 text-amber-400" />
                  <p className="text-sm text-gray-400">No exchangeable items found.</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Only items from rounds posted in the last 6 hours can be exchanged.
                  </p>
                </div>
              ) : (
                exchangeableItems.map((item) => {
                  const isSelected = returnedItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border transition-all ${
                        item.alreadyExchanged
                          ? "border-gray-700/30 bg-gray-800/20 opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "border-purple-500 bg-purple-900/30"
                          : "border-gray-700/50 bg-gray-800/40 hover:border-purple-500/50 hover:bg-gray-800/60 cursor-pointer"
                      }`}
                      onClick={() => {
                        if (!item.alreadyExchanged) selectReturnItem(item);
                      }}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white text-sm flex items-center gap-2">
                              {item.productName}
                              {item.alreadyExchanged && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  EXCHANGED
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Order #{item.roundNumber} &nbsp;·&nbsp; Ordered qty: {item.quantity}
                            </p>
                          </div>
                          <span className="font-mono text-sm font-bold text-pink-400">
                            KSh {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        {/* Quantity selector — only when this item is selected */}
                        {isSelected && !item.alreadyExchanged && (
                          <div
                            className="mt-3 pt-3 border-t border-purple-500/20 flex items-center justify-between"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-xs text-purple-300 font-medium">
                              Qty to return:
                            </span>
                            <QtyControl
                              value={returnedQty}
                              min={1}
                              max={item.quantity}
                              onChange={setReturnedQty}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* STEP 1: Select replacement product + quantity */}
          {step === STEPS.SELECT_REPLACEMENT && (
            <div className="space-y-3">
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                <p className="text-xs text-purple-300 font-semibold uppercase tracking-wide mb-1">
                  Returning
                </p>
                <p className="text-sm text-white font-medium">{returnedItem?.productName}</p>
                <p className="text-xs text-gray-400">
                  Qty: {returnedQty} &nbsp;·&nbsp; KSh{" "}
                  {(returnedItem?.price * returnedQty).toFixed(2)}
                </p>
              </div>

              <p className="text-sm text-gray-400">Search and select the replacement product:</p>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-800/60 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                />
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const isSelected = replacementProduct?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => selectReplacement(p)}
                      className={`rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-purple-500 bg-purple-900/30"
                          : "border-gray-700/50 bg-gray-800/40 hover:border-purple-500/50 hover:bg-gray-800/60"
                      }`}
                    >
                      <div className="p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-white text-sm">{p.name}</p>
                            {p.track_inventory && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Stock: {p.current_stock}
                              </p>
                            )}
                          </div>
                          <span className="font-mono text-sm font-bold text-pink-400">
                            KSh {parseFloat(p.price).toFixed(2)}
                          </span>
                        </div>

                        {/* Quantity selector — only when selected */}
                        {isSelected && (
                          <div
                            className="mt-2 pt-2 border-t border-purple-500/20 flex items-center justify-between"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-xs text-purple-300 font-medium">
                              Qty to add:
                            </span>
                            <QtyControl
                              value={replacementQty}
                              min={1}
                              max={p.track_inventory ? p.current_stock : 99}
                              onChange={setReplacementQty}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-4">No products found</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PIN authorization */}
          {step === STEPS.ENTER_PIN && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-800/40 rounded-xl p-4 space-y-2 border border-gray-700/50">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
                  Exchange Summary
                </p>
                <div className="flex items-start gap-2 text-sm">
                  <div className="text-red-400 line-through flex-1">
                    {returnedItem?.productName}
                    {returnedQty > 1 && (
                      <span className="text-red-500 text-xs ml-1">×{returnedQty}</span>
                    )}
                  </div>
                  <ArrowLeftRight size={14} className="text-gray-400 shrink-0 mt-0.5" />
                  <div className="text-green-400 font-medium flex-1 text-right">
                    {replacementProduct?.name}
                    {replacementQty > 1 && (
                      <span className="text-green-500 text-xs ml-1">×{replacementQty}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-gray-700/40">
                  <span>Net charge to bill:</span>
                  <span className="font-mono font-bold text-pink-400">
                    KSh{" "}
                    {(
                      parseFloat(replacementProduct?.price || 0) * replacementQty -
                      parseFloat(returnedItem?.price || 0) * returnedQty
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <Lock size={28} className="mx-auto mb-2 text-purple-400" />
                <p className="text-sm font-medium text-white">Manager Authorization Required</p>
                <p className="text-xs text-gray-400 mt-1">
                  Enter the PIN of a user with exchange privileges
                </p>
              </div>

              {/* PIN display */}
              <div className="flex justify-center gap-2">
                {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg font-bold ${
                      i < pin.length
                        ? "border-purple-500 bg-purple-900/30 text-purple-300"
                        : "border-gray-600 bg-gray-800/40 text-gray-600"
                    }`}
                  >
                    {i < pin.length ? "●" : ""}
                  </div>
                ))}
              </div>

              {pinError && (
                <p className="text-center text-xs text-red-400">{pinError}</p>
              )}

              {/* PIN keypad */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <button
                    key={d}
                    onClick={() => handlePinDigit(String(d))}
                    className="py-3 rounded-xl bg-gray-800/60 hover:bg-gray-700/60 active:scale-95 text-white font-bold text-lg transition-all border border-gray-700/40"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={handlePinDelete}
                  className="py-3 rounded-xl bg-gray-800/40 hover:bg-gray-700/40 active:scale-95 text-gray-300 font-bold text-sm transition-all border border-gray-700/30"
                >
                  ⌫
                </button>
                <button
                  onClick={() => handlePinDigit("0")}
                  className="py-3 rounded-xl bg-gray-800/60 hover:bg-gray-700/60 active:scale-95 text-white font-bold text-lg transition-all border border-gray-700/40"
                >
                  0
                </button>
                <button
                  onClick={() => setPin("")}
                  className="py-3 rounded-xl bg-gray-800/40 hover:bg-gray-700/40 active:scale-95 text-gray-300 font-bold text-xs transition-all border border-gray-700/30"
                >
                  CLR
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-purple-500/10 shrink-0 space-y-2">
          {step === STEPS.SELECT_RETURN && (
            <button
              onClick={advanceFromReturn}
              disabled={!returnedItem || loading}
              className={`w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                !returnedItem || loading
                  ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-lg shadow-purple-500/20"
              }`}
            >
              Next: Select Replacement
              <ChevronRight size={18} />
            </button>
          )}

          {step === STEPS.SELECT_REPLACEMENT && (
            <button
              onClick={advanceFromReplacement}
              disabled={!replacementProduct || loading}
              className={`w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                !replacementProduct || loading
                  ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-lg shadow-purple-500/20"
              }`}
            >
              Next: Authorize
              <ChevronRight size={18} />
            </button>
          )}

          {step === STEPS.ENTER_PIN && (
            <button
              onClick={handleSubmit}
              disabled={pin.length < 4 || loading}
              className={`w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                pin.length < 4 || loading
                  ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                  : "bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 shadow-lg shadow-purple-500/30"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing Exchange...
                </>
              ) : (
                <>
                  <ArrowLeftRight size={18} />
                  Confirm Exchange
                </>
              )}
            </button>
          )}

          {step > STEPS.SELECT_RETURN && (
            <button
              onClick={goBack}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 font-medium text-sm transition-all border border-gray-700/30"
            >
              Back
            </button>
          )}

          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-gray-500 hover:text-gray-300 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeModal;

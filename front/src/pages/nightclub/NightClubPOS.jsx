import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useBills } from "../../hooks/useBills";
import { usePayments } from "../../hooks/usePayments";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  Zap,
  Receipt,
  User,
  ArrowRight,
  Check,
  Wine,
  Beer,
  Coffee,
  GlassWater,
  Utensils,
  MoreHorizontal,
  Banknote,
  Smartphone,
  ChevronLeft,
  Flame,
  Clock,
} from "lucide-react";
import { calculateBillTotals } from "../../utils/calculations";
import toast from "react-hot-toast";

// Quick action icons mapping
const categoryIcons = {
  "beer": Beer,
  "wine": Wine,
  "spirits": GlassWater,
  "cocktails": GlassWater,
  "soft drinks": Coffee,
  "food": Utensils,
  "default": MoreHorizontal,
};

const NightClubPOS = ({ onUpdate }) => {
  const { user } = useAuth();
  const { products, isLoading: productsLoading, reload: productsReload } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { openBill, addRound, payBill, cancelBill, isLoading: billsLoading } = useBills();
  const { bills: paymentBills, reloadBills } = usePayments();

  // State
  const [activeBill, setActiveBill] = useState(null);
  const [currentRoundItems, setCurrentRoundItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [quickMode, setQuickMode] = useState(true); // Default to quick mode
  const [showPayment, setShowPayment] = useState(false);
  const [showBillList, setShowBillList] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isProcessing, setIsProcessing] = useState(false);

  const isBartender = user?.role === "bartender";

  // Get open bills
  const openBills = useMemo(() => {
    return paymentBills.filter((b) => b.status === "open");
  }, [paymentBills]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) => p.active);

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [products, selectedCategory, searchTerm]);

  // Popular products (top 8 by default)
  const popularProducts = useMemo(() => {
    return products
      .filter((p) => p.active)
      .slice(0, 8);
  }, [products]);

  // Quick start new bill
  const handleQuickStart = async (name) => {
    const billName = name || `Table ${Math.floor(Math.random() * 100)}`;
    try {
      const newBill = await openBill({ customerName: billName });
      setActiveBill(newBill);
      setCurrentRoundItems([]);
      setCustomerName("");
      toast.success(`Started: ${billName}`, { duration: 1500 });
      reloadBills();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Failed to start bill");
    }
  };

  // Add product to current round
  const handleAddProduct = (product) => {
    if (!activeBill) {
      // Auto-start bill with quick name
      handleQuickStart(`Quick ${Math.floor(Math.random() * 1000)}`);
      return;
    }

    const existing = currentRoundItems.find((item) => item.id === product.id);
    if (existing) {
      setCurrentRoundItems(
        currentRoundItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCurrentRoundItems([
        ...currentRoundItems,
        {
          id: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
        },
      ]);
    }

    // Haptic feedback effect
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  // Update quantity
  const handleUpdateQuantity = (itemId, delta) => {
    setCurrentRoundItems((items) =>
      items
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove item
  const handleRemoveItem = (itemId) => {
    setCurrentRoundItems(currentRoundItems.filter((item) => item.id !== itemId));
  };

  // Add round to bill
  const handleAddRound = async () => {
    if (currentRoundItems.length === 0) return;

    setIsProcessing(true);
    try {
      await addRound(activeBill.id, { items: currentRoundItems });
      setCurrentRoundItems([]);
      
      // Refresh bill
      const updatedBill = paymentBills.find((b) => b.id === activeBill.id);
      if (updatedBill) {
        setActiveBill(updatedBill);
      }
      
      toast.success("Added!", { icon: "⚡", duration: 1000 });
      await Promise.all([productsReload(), reloadBills()]);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Failed to add");
    } finally {
      setIsProcessing(false);
    }
  };

  // Process payment
  const handlePayment = async () => {
    if (!activeBill) return;

    setIsProcessing(true);
    try {
      const totals = calculateBillTotals(activeBill);

      if (isBartender) {
        await payBill(activeBill.id, {
          paymentMethod,
          amount: totals.total,
        });
        toast.success("✅ Paid & Confirmed!", { duration: 2000 });
      } else {
        await payBill(activeBill.id, {
          paymentMethod,
          amount: totals.total,
        });
        toast.success("💰 Marked for payment", { duration: 2000 });
      }

      setShowPayment(false);
      setActiveBill(null);
      setCurrentRoundItems([]);
      await reloadBills();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // Select existing bill
  const handleSelectBill = (bill) => {
    setActiveBill(bill);
    setCurrentRoundItems([]);
    setShowBillList(false);
    toast.success(`Loaded: ${bill.customer_name}`, { duration: 1500 });
  };

  // Void bill
  const handleVoidBill = async () => {
    if (!activeBill) return;
    
    const confirmed = window.confirm(`Void bill for ${activeBill.customer_name}?`);
    if (!confirmed) return;

    try {
      await cancelBill(activeBill.id);
      toast.success("Bill voided", { duration: 1500 });
      setActiveBill(null);
      setCurrentRoundItems([]);
      await reloadBills();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Failed to void");
    }
  };

  // Calculate totals
  const currentRoundTotal = currentRoundItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const billTotals = activeBill ? calculateBillTotals(activeBill) : null;
  const grandTotal = (billTotals?.subtotal || 0) + currentRoundTotal;

  // Loading state
  if (productsLoading || categoriesLoading || billsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Night Mode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Quick Actions Header */}
        <div className="p-3 bg-gray-900/50 border-b border-purple-500/20">
          {/* Search & Quick Start */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Find drink..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowBillList(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-sm flex items-center gap-2"
            >
              <Receipt size={18} />
              <span className="hidden sm:inline">Bills ({openBills.length})</span>
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <Flame size={14} className="inline mr-1" />
              All
            </button>
            {categories
              .filter((c) => c.active)
              .map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Quick Start Options (when no active bill) */}
          {!activeBill && (
            <div className="mb-4 p-4 bg-gradient-to-r from-pink-900/30 to-purple-900/30 rounded-xl border border-pink-500/20">
              <p className="text-pink-400 text-sm font-medium mb-3 flex items-center gap-2">
                <Zap size={16} />
                Quick Start
              </p>
              <div className="flex flex-wrap gap-2">
                {["Table 1", "Table 2", "Table 3", "Bar 1", "Bar 2", "VIP 1"].map((table) => (
                  <button
                    key={table}
                    onClick={() => handleQuickStart(table)}
                    className="px-4 py-2 bg-gray-800 hover:bg-pink-600 rounded-lg text-sm transition-colors"
                  >
                    {table}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="Custom..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleQuickStart(customerName)}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>
          )}

          {/* Products */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {(searchTerm ? filteredProducts : popularProducts).map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product)}
                disabled={!activeBill && false} // Allow clicking to auto-start
                className="relative p-3 bg-gray-800/80 hover:bg-gray-700 rounded-xl border border-gray-700 hover:border-pink-500/50 transition-all active:scale-95 text-left group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">
                    {product.name}
                  </h3>
                </div>
                <p className="text-lg font-bold text-pink-400">
                  KSh {product.price}
                </p>
                {product.current_stock < 10 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" title="Low stock" />
                )}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && searchTerm && (
            <div className="text-center py-12 text-gray-500">
              <p>No drinks found</p>
              <button
                onClick={() => setSearchTerm("")}
                className="text-pink-400 hover:text-pink-300 mt-2"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Current Bill */}
      <div className="w-full md:w-80 lg:w-96 bg-gray-900/80 border-t md:border-t-0 md:border-l border-purple-500/20 flex flex-col">
        {activeBill ? (
          <>
            {/* Bill Header */}
            <div className="p-4 border-b border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-pink-400" />
                  <h2 className="font-bold text-lg">{activeBill.customer_name}</h2>
                </div>
                <button
                  onClick={() => setActiveBill(null)}
                  className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Started {new Date(activeBill.created_at).toLocaleTimeString()}
              </p>
            </div>

            {/* Bill Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Previous Rounds Summary */}
              {activeBill.rounds?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Previous ({activeBill.rounds.length} rounds)
                  </p>
                  <div className="bg-gray-800/50 rounded-lg p-3 space-y-1">
                    {activeBill.rounds.slice(-2).map((round) => (
                      <div key={round.id} className="text-xs text-gray-400">
                        <span className="text-pink-400">Round {round.round_number}:</span>
                        {" "}
                        {round.round_items.reduce((sum, i) => sum + i.quantity, 0)} items
                      </div>
                    ))}
                    {activeBill.rounds.length > 2 && (
                      <p className="text-xs text-gray-500">
                        +{activeBill.rounds.length - 2} more rounds
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Current Round */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Current Order
                </p>
                {currentRoundItems.length > 0 ? (
                  <div className="space-y-2">
                    {currentRoundItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 bg-gray-800 rounded-lg p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-gray-500">KSh {item.price}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="p-1 hover:bg-gray-700 rounded"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center font-bold">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="p-1 hover:bg-gray-700 rounded"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-red-400 hover:bg-red-900/30 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    Tap drinks to add
                  </div>
                )}
              </div>
            </div>

            {/* Bill Footer */}
            <div className="p-4 border-t border-purple-500/20 space-y-3">
              {/* Totals */}
              <div className="space-y-1">
                {billTotals?.subtotal > 0 && (
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Previous</span>
                    <span>KSh {billTotals.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {currentRoundTotal > 0 && (
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Current</span>
                    <span>KSh {currentRoundTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-bold text-pink-400">
                    KSh {grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {currentRoundItems.length > 0 && (
                  <button
                    onClick={handleAddRound}
                    disabled={isProcessing}
                    className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-xl font-bold text-white shadow-lg shadow-pink-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    Add to Bill
                    <span className="px-2 py-0.5 bg-white/20 rounded-lg text-sm">
                      KSh {currentRoundTotal.toFixed(0)}
                    </span>
                  </button>
                )}

                {activeBill.rounds?.length > 0 && currentRoundItems.length === 0 && (
                  <button
                    onClick={() => setShowPayment(true)}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold text-white shadow-lg shadow-green-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Banknote size={20} />
                    Pay Now
                  </button>
                )}

                <button
                  onClick={handleVoidBill}
                  className="w-full py-2 bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-xl text-sm transition-colors"
                >
                  Void Bill
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No Active Bill State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Receipt size={32} className="text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-400 mb-2">No Active Bill</h3>
            <p className="text-gray-500 text-sm mb-4">
              Tap a quick start button or select an existing bill
            </p>
            <button
              onClick={() => setShowBillList(true)}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-xl font-medium transition-colors"
            >
              View Open Bills
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPayment && activeBill && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-purple-500/20">
            <h2 className="text-2xl font-bold mb-4">Process Payment</h2>
            <p className="text-gray-400 mb-4">{activeBill.customer_name}</p>
            
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500">Amount Due</p>
              <p className="text-4xl font-bold text-pink-400">
                KSh {grandTotal.toFixed(2)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === "cash"
                    ? "border-green-500 bg-green-500/20"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <Banknote size={24} className="mx-auto mb-2" />
                <span className="font-medium">Cash</span>
              </button>
              <button
                onClick={() => setPaymentMethod("mpesa")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === "mpesa"
                    ? "border-green-500 bg-green-500/20"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <Smartphone size={24} className="mx-auto mb-2" />
                <span className="font-medium">M-Pesa</span>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 py-3 bg-gray-800 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-bold disabled:opacity-50"
              >
                {isProcessing ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill List Modal */}
      {showBillList && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col border border-purple-500/20">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold">Open Bills ({openBills.length})</h2>
              <button
                onClick={() => setShowBillList(false)}
                className="p-2 hover:bg-gray-800 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {openBills.map((bill) => {
                const billTotal = calculateBillTotals(bill);
                return (
                  <button
                    key={bill.id}
                    onClick={() => handleSelectBill(bill)}
                    className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold">{bill.customer_name}</p>
                      <p className="text-sm text-gray-500">
                        {bill.rounds?.length || 0} rounds • {" "}
                        {new Date(bill.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-pink-400">
                        KSh {billTotal.total.toFixed(2)}
                      </p>
                      <ArrowRight size={16} className="inline text-gray-500" />
                    </div>
                  </button>
                );
              })}
              {openBills.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Receipt size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No open bills</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NightClubPOS;

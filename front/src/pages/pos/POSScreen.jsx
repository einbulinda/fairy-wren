import { useState, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useBills } from "../../hooks/useBills";
import { usePayments } from "../../hooks/usePayments";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import {
  ShoppingCart,
  Receipt,
  FileText,
  ClipboardCheck,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  AlertCircle,
  Lock,
  Copy,
  Grid as GridIcon,
} from "lucide-react";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import { calculateBillTotals } from "../../utils/calculations";
import toast from "react-hot-toast";
import ReceiptModal from "../../components/shared/ReceiptModal";
import OpenBillsModal from "../../components/bills/OpenBillsModal";
import AllBillsView from "../../components/bills/AllBillsView";
import ProductGrid from "../../components/products/ProductGrid";
import PaymentModal from "../../components/pos/PaymentModal";

const POSScreen = () => {
  const { user } = useAuth();
  const {
    products,
    isLoading: productsLoading,
    reload: productsReload,
  } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const {
    openBill: startABill,
    addRound: addRoundToBill,
    payBill,
    cancelBill,
    isLoading: billsLoading,
  } = useBills();
  const {
    bills: paymentBills,
    confirmBill,
    reloadBills,
    isLoading: paymentsLoading,
  } = usePayments();

  // Tab state
  const [activeTab, setActiveTab] = useState("pos"); // 'pos', 'bills', 'confirm'

  // POS state
  const [activeBill, setActiveBill] = useState(null);
  const [currentRoundItems, setCurrentRoundItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Modals
  const [showOpenBillsModal, setShowOpenBillsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Role checks
  const isBartender = user?.role === "bartender";
  const canAccessConfirm = isBartender;

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) => p.active);

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [products, selectedCategory, searchTerm]);

  // Bills awaiting confirmation
  const awaitingConfirmation = useMemo(() => {
    return paymentBills.filter(
      (bill) => bill.status === "awaiting_confirmation"
    );
  }, [paymentBills]);

  // Get open bills
  const openBills = useMemo(() => {
    return paymentBills.filter((b) => b.status === "open");
  }, [paymentBills]);

  // POS Functions
  const handleStartNewBill = async () => {
    const customerName = prompt("Enter Customer Name/Table:");
    if (!customerName?.trim()) return;

    try {
      const newBill = await startABill({ customerName: customerName.trim() });
      setActiveBill(newBill);
      setCurrentRoundItems([]);
      toast.success("New bill started!");
      reloadBills();
    } catch (error) {
      toast.error("Failed to create bill");
      console.error(error);
    }
  };

  const handleSelectOpenBill = (bill) => {
    setActiveBill(bill);
    setCurrentRoundItems([]);
    setShowOpenBillsModal(false);
    toast.success(`Switched to ${bill.customer_name}'s bill`);
  };

  const handleAddProduct = (product) => {
    if (!activeBill) {
      toast.error("Please start or select an open a bill first");
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
  };

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

  const handleRemoveItem = (itemId) => {
    setCurrentRoundItems(
      currentRoundItems.filter((item) => item.id !== itemId)
    );
  };

  const handleAddRound = async () => {
    if (currentRoundItems.length === 0) {
      toast.error("Add items to the round first");
      return;
    }

    try {
      await addRoundToBill(activeBill.id, { items: currentRoundItems });
      setCurrentRoundItems([]);

      // Refresh the active bill
      const updatedBill = paymentBills.find((b) => b.id === activeBill.id);
      setActiveBill(updatedBill);

      toast.success("Round added to bill!");
      await Promise.all([productsReload(), reloadBills()]);
    } catch (error) {
      toast.error("Failed to add round");
      console.error(error);
    }
  };

  const handleCloseView = () => {
    setActiveBill(null);
    setCurrentRoundItems([]);
  };

  const handleVoidBill = async () => {
    if (!activeBill) return;

    const confirmed = window.confirm(
      `Are you sure you want to VOID this bill for ${activeBill.customer_name}?\n\nThis action cannot be undone and will permanently delete this bill.`
    );

    if (!confirmed) return;

    try {
      // Call void bill API
      await cancelBill(activeBill.id);

      toast.success(`Bill for ${activeBill.customer_name} has been voided`);
      setActiveBill(null);
      setCurrentRoundItems([]);
      await Promise.all([productsReload(), reloadBills()]);
    } catch (error) {
      toast.error("Failed to void bill");
      console.error(error);
    }
  };

  const handleOpenPaymentModal = () => {
    if (currentRoundItems.length > 0) {
      toast.error("Please add current round before payment");
      return;
    }
    if (!activeBill || activeBill.rounds.length === 0) {
      toast.error("Cannot process payment for empty bill");
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    setPaymentLoading(true);
    try {
      const totals = calculateBillTotals(activeBill);

      if (isBartender) {
        // Bartender auto-confirms
        await confirmBill(activeBill.id, {
          paymentMethod,
          amount: totals.total,
        });
        toast.success("Bill completed and auto-confirmed!");
      } else {
        // Waitress marks as paid
        const billDtls = {
          paymentMethod,
          amount: totals.total,
        };

        await payBill(activeBill.id, billDtls);
        toast.success("Bill marked as paid! Awaiting bartender confirmation.");
        reloadBills();
      }

      setShowPaymentModal(false);
      setActiveBill(null);
      setCurrentRoundItems([]);
      await reloadBills();
    } catch (error) {
      toast.error("Failed to process payment");
      console.error(error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleConfirmBillPayment = async (billId, paymentMode) => {
    const confirmed = window.confirm("Confirm that payment has been received?");
    if (!confirmed) return;

    try {
      const paymentDtls = { paymentMode: paymentMode };
      await confirmBill(billId, paymentDtls);

      toast.success("Payment confirmed successfully");

      await reloadBills();
    } catch (error) {
      toast.error("Failed to confirm payment");
      console.error(error);
    }
  };

  const copyBillId = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const calculateCurrentRoundTotal = () => {
    return currentRoundItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  };

  const currentRoundTotal = calculateCurrentRoundTotal();
  const billTotals = activeBill ? calculateBillTotals(activeBill) : null;

  if (productsLoading || categoriesLoading || billsLoading || paymentsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Desktop Navigation Bar */}
      <div className="hidden md:block bg-gray-900/40 backdrop-blur-md border-b border-purple-500/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("pos")}
              className={`
                px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium
                ${
                  activeTab === "pos"
                    ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                    : "bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800"
                }
              `}
            >
              <ShoppingCart size={18} />
              <span>POS</span>
            </button>

            <button
              onClick={() => setActiveTab("bills")}
              className={`
                px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium
                ${
                  activeTab === "bills"
                    ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                    : "bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800"
                }
              `}
            >
              <FileText size={18} />
              <span>All Bills</span>
              <span
                className={`
                px-2 py-0.5 rounded-full text-xs font-bold
                ${
                  activeTab === "bills"
                    ? "bg-white/20"
                    : "bg-purple-500/20 text-purple-300"
                }
              `}
              >
                {paymentBills.length}
              </span>
            </button>

            {canAccessConfirm && (
              <button
                onClick={() => setActiveTab("confirm")}
                className={`
                  px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium
                  ${
                    activeTab === "confirm"
                      ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                      : "bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800"
                  }
                `}
              >
                <ClipboardCheck size={18} />
                <span>Confirm</span>
                {awaitingConfirmation.length > 0 && (
                  <span
                    className={`
                    px-2 py-0.5 rounded-full text-xs font-bold
                    ${
                      activeTab === "confirm"
                        ? "bg-white/20"
                        : "bg-orange-500/20 text-orange-300 animate-pulse"
                    }
                  `}
                  >
                    {awaitingConfirmation.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Action Buttons - Only visible in POS tab */}
          {activeTab === "pos" && (
            <>
              <div className="h-8 w-px bg-purple-500/20 mx-2" />
              <div className="flex gap-2">
                <button
                  onClick={handleStartNewBill}
                  className="px-4 py-2 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/20"
                >
                  <Plus size={18} />
                  <span>New Bill</span>
                </button>
                <button
                  onClick={() => setShowOpenBillsModal(true)}
                  className="px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/20"
                >
                  <Receipt size={18} />
                  <span>Open Bills ({openBills.length})</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Quick Action Bar - Only for POS tab */}
      {activeTab === "pos" && (
        <div className="md:hidden bg-gray-900/40 backdrop-blur-md border-b border-purple-500/20 px-3 py-2">
          <div className="flex gap-2">
            <button
              onClick={handleStartNewBill}
              className="flex-1 px-3 py-2.5 bg-linear-to-r from-green-600 to-emerald-600 active:from-green-700 active:to-emerald-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/20"
            >
              <Plus size={20} />
              <span>New Bill</span>
            </button>
            <button
              onClick={() => setShowOpenBillsModal(true)}
              className="flex-1 px-3 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 active:from-blue-700 active:to-indigo-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/20 relative"
            >
              <Receipt size={20} />
              <span>Open ({openBills.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden md:pb-0 pb-16">
        {/* Added pb-16 for mobile bottom nav space */}
        {/* POS View */}
        {activeTab === "pos" && (
          <div className="h-full flex overflow-hidden">
            {/* Category Side Panel for Large Screens */}
            <aside className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-purple-500/20 bg-gray-900/20 h-full overflow-hidden">
              {/* Fixed Header */}
              <div className="shrink-0 p-4 border-b border-purple-500/20">
                <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  Categories
                </h3>
              </div>

              {/* Scrollable Categories Area */}
              <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                <div className="grid grid-cols-2 gap-2">
                  {/* All Products Button - Spans 2 columns */}
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`
                      col-span-2 text-center px-3 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm
                      ${
                        selectedCategory === "all"
                          ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                          : "bg-gray-800/40 border border-purple-500/20 text-gray-300 hover:text-white hover:bg-gray-800/60"
                      }
                    `}
                  >
                    <GridIcon size={16} />
                    <span>All Products</span>
                  </button>

                  {/* Category Buttons in 2-column grid */}
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`
                        text-center px-2 py-3 rounded-lg transition-all duration-200 font-medium text-sm
                        ${
                          selectedCategory === cat.id
                            ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                            : "bg-gray-800/40 border border-purple-500/20 text-gray-300 hover:text-white hover:bg-gray-800/60"
                        }
                      `}
                    >
                      <span className="block truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Category Tabs for Mobile/Tablet - Horizontal Scrollable */}
            <div className="lg:hidden border-b border-purple-500/20 bg-gray-900/20">
              <div className="overflow-x-auto px-3 py-3">
                <div className="flex gap-2 min-w-max">
                  {/* All Products */}
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`
                      px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 text-sm font-medium flex items-center gap-2
                      ${
                        selectedCategory === "all"
                          ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                          : "bg-gray-800/60 text-gray-300 hover:bg-gray-800"
                      }
                    `}
                  >
                    <GridIcon size={14} />
                    All Products
                  </button>

                  {/* Categories */}
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`
                        px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 text-sm font-medium
                        ${
                          selectedCategory === cat.id
                            ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                            : "bg-gray-800/60 text-gray-300 hover:bg-gray-800"
                        }
                      `}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Products and Bill Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-y-auto">
              {/* Products Section */}
              <div className="lg:col-span-2 space-y-4">
                {/* Search Bar - Cleaner Design */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Quick search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 rounded-xl bg-gray-900/60 backdrop-blur-md border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-base"
                  />
                  <Search
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400"
                    size={20}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                {/* Products Grid */}
                <ProductGrid
                  products={filteredProducts}
                  onProductClick={handleAddProduct}
                  disabled={!activeBill}
                />
              </div>

              {/* Current Bill Section */}
              <div className="lg:col-span-1">
                <div className="bg-linear-to-br from-gray-900/60 to-gray-800/60 backdrop-blur-md rounded-xl border border-purple-500/20 p-5 shadow-xl sticky top-4 max-h-[calc(100vh-120px)] flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                      <Receipt size={20} />
                      Current Bill
                    </h3>
                    {activeBill && (
                      <button
                        onClick={handleCloseView}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>

                  {activeBill ? (
                    <div className="space-y-4 flex-1 overflow-y-auto">
                      {/* Customer Info */}
                      <div className="bg-purple-900/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/20">
                        <p className="text-xs text-purple-300 font-semibold mb-1">
                          Customer
                        </p>
                        <p className="text-lg font-bold text-white">
                          {activeBill.customer_name}
                        </p>
                      </div>

                      {/* Previous Rounds */}
                      {activeBill.rounds && activeBill.rounds.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider">
                            Previous Rounds
                          </p>
                          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                            {activeBill.rounds.map((round) => (
                              <div
                                key={round.id}
                                className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-2 border border-purple-500/10"
                              >
                                <div className="text-xs text-purple-400 font-semibold mb-1">
                                  Round {round.round_number}
                                </div>
                                <div className="space-y-0.5">
                                  {round.round_items.map((item) => (
                                    <div
                                      key={item.product.id}
                                      className="flex justify-between text-xs"
                                    >
                                      <span className="text-gray-300">
                                        {item.quantity}x {item.product.name}
                                      </span>
                                      <span className="font-mono font-semibold text-pink-400">
                                        KSh{" "}
                                        {(item.price * item.quantity).toFixed(
                                          2
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Current Round Items */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider">
                            Current Round
                          </p>
                          {currentRoundItems.length > 0 && (
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                              {currentRoundItems.length} items
                            </span>
                          )}
                        </div>

                        {currentRoundItems.length > 0 ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {currentRoundItems.map((item) => (
                              <div
                                key={item.id}
                                className="bg-linear-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-lg p-2 border border-purple-500/20"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <p className="font-medium text-white text-sm truncate">
                                      {item.productName}
                                    </p>
                                    <p className="text-xs text-purple-300">
                                      KSh {item.price.toFixed(2)} each
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="text-red-400 hover:text-red-300 transition-colors shrink-0"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 bg-gray-900/40 rounded-lg p-0.5">
                                    <button
                                      onClick={() =>
                                        handleUpdateQuantity(item.id, -1)
                                      }
                                      className="p-1 rounded hover:bg-purple-500/20 text-purple-300 transition-colors"
                                    >
                                      <Minus size={13} />
                                    </button>
                                    <span className="text-sm font-bold text-white px-2">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleUpdateQuantity(item.id, 1)
                                      }
                                      className="p-1 rounded hover:bg-purple-500/20 text-purple-300 transition-colors"
                                    >
                                      <Plus size={13} />
                                    </button>
                                  </div>
                                  <span className="font-mono font-bold text-pink-400 text-sm">
                                    KSh{" "}
                                    {(item.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-xs bg-gray-900/20 rounded-lg border border-purple-500/10">
                            No items in current round
                          </div>
                        )}
                      </div>

                      {/* Totals */}
                      <div className="space-y-1.5 pt-3 border-t border-purple-500/20">
                        {billTotals && billTotals.subtotal > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Previous:</span>
                            <span className="font-mono text-white">
                              KSh {billTotals.subtotal.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {currentRoundTotal > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Current:</span>
                            <span className="font-mono text-white">
                              KSh {currentRoundTotal.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1.5 border-t border-purple-500/10">
                          <span className="text-base font-bold text-purple-300">
                            Total:
                          </span>
                          <span className="text-xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                            KSh{" "}
                            {(
                              (billTotals?.subtotal || 0) + currentRoundTotal
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-3">
                        {currentRoundItems.length > 0 && (
                          <button
                            onClick={handleAddRound}
                            className="w-full py-2.5 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 text-sm"
                          >
                            <Plus size={17} />
                            Add Round to Bill
                          </button>
                        )}
                        {activeBill.rounds && activeBill.rounds.length > 0 && (
                          <button
                            onClick={handleOpenPaymentModal}
                            disabled={currentRoundItems.length > 0}
                            className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg text-sm ${
                              currentRoundItems.length > 0
                                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                : "bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-500/30"
                            }`}
                          >
                            <Check size={17} />
                            Process Payment
                          </button>
                        )}

                        {/* View Receipt - Only show if bill has rounds */}
                        {activeBill.rounds && activeBill.rounds.length > 0 && (
                          <button
                            onClick={() => setShowReceiptModal(true)}
                            className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-xs"
                          >
                            <FileText size={15} />
                            View Receipt
                          </button>
                        )}

                        {/* Void Bill Button - Always available for open bills */}
                        <button
                          onClick={handleVoidBill}
                          className="w-full py-2 bg-red-900/40 border border-red-500/30 hover:bg-red-900/60 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-xs"
                        >
                          <AlertCircle size={15} />
                          Void Bill
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 flex-1 flex flex-col items-center justify-center">
                      <AlertCircle
                        size={40}
                        className="mx-auto mb-2 opacity-50"
                      />
                      <p className="font-medium text-sm">No active bill</p>
                      <p className="text-xs mt-1">
                        Start new or select open bill
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Bills View */}
        {activeTab === "bills" && (
          <div className="p-4 overflow-y-auto h-full">
            <AllBillsView bills={paymentBills} />
          </div>
        )}

        {/* Confirm Payments View */}
        {activeTab === "confirm" && (
          <div className="p-4 overflow-y-auto h-full">
            <div className="space-y-4">
              {!canAccessConfirm ? (
                <div className="text-center text-gray-400 py-16 bg-linear-to-br from-red-900/20 to-red-900/10 backdrop-blur-sm rounded-xl border border-red-500/20">
                  <Lock
                    size={64}
                    className="mx-auto mb-4 opacity-50 text-red-400"
                  />
                  <p className="text-xl font-medium text-red-400">
                    Access Restricted
                  </p>
                  <p className="text-sm mt-2">
                    Only bartenders can access payment confirmations
                  </p>
                </div>
              ) : awaitingConfirmation.length > 0 ? (
                <div className="grid gap-4">
                  {awaitingConfirmation.map((bill) => {
                    const totals = calculateBillTotals(bill);
                    const { payments } = bill;

                    return (
                      <div
                        key={bill.id}
                        className="bg-linear-to-br from-yellow-900/20 to-orange-900/20 backdrop-blur-md rounded-xl border-2 border-yellow-500/30 p-6 shadow-lg shadow-yellow-500/10"
                      >
                        <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-4">
                              <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                                <AlertCircle className="w-6 h-6 text-yellow-400" />
                              </div>
                              <div>
                                <h3 className="text-2xl font-bold text-yellow-400">
                                  {bill.customer_name}
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">
                                  Served By:{" "}
                                  <span className="text-white font-medium">
                                    {bill.created_by_user.name}
                                  </span>
                                </p>
                                {bill.marked_paid_at && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Marked Paid:{" "}
                                    {new Date(
                                      bill.marked_paid_at
                                    ).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg p-4 border border-purple-500/10">
                              <h4 className="font-semibold text-sm text-purple-300 mb-3 flex items-center gap-2">
                                <Receipt size={16} />
                                Bill Details
                              </h4>
                              <div className="space-y-3">
                                {bill.rounds.map((round) => (
                                  <div key={round.id}>
                                    <div className="text-xs text-purple-400 font-semibold mb-1">
                                      Round {round.round_number}
                                    </div>
                                    <div className="space-y-1">
                                      {round.round_items.map((item) => (
                                        <div
                                          key={item.product.id}
                                          className="flex justify-between text-sm"
                                        >
                                          <span className="text-gray-300">
                                            {item.quantity}x {item.product.name}
                                          </span>
                                          <span className="font-mono font-semibold text-pink-400">
                                            KSh{" "}
                                            {(
                                              item.price * item.quantity
                                            ).toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="lg:w-80 flex flex-col gap-4">
                            <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg p-4 border border-purple-500/10 space-y-3">
                              <div className="flex items-center justify-center">
                                <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-sm font-semibold text-yellow-300">
                                  Awaiting Confirmation
                                </div>
                              </div>

                              <div className="text-center">
                                <div className="text-4xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                                  KSh {totals.total.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-400 mt-2 uppercase font-semibold">
                                  {payments?.length >= 1
                                    ? payments[0]?.payment_type
                                    : "Default: Cash"}
                                </div>
                              </div>

                              {bill.mpesa_code && (
                                <div className="flex items-center justify-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                  <span className="text-xs text-gray-400">
                                    M-Pesa Code:
                                  </span>
                                  <span className="font-mono text-sm font-bold text-green-400">
                                    {bill.mpesa_code}
                                  </span>
                                  <button
                                    onClick={() => copyBillId(bill.mpesa_code)}
                                    className="p-1 rounded hover:bg-green-500/20 transition-colors"
                                  >
                                    <Copy
                                      size={12}
                                      className="text-green-400"
                                    />
                                  </button>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                const mode = payments[0]?.payment_type
                                  ? payments[0].payment_type
                                  : "cash";
                                handleConfirmBillPayment(bill.id, mode);
                              }}
                              className="w-full py-4 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-200 border border-green-500/30"
                            >
                              <Check size={24} />
                              Confirm Payment Received
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-16 bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10">
                  <ClipboardCheck
                    size={64}
                    className="mx-auto mb-4 opacity-50 text-green-400"
                  />
                  <p className="text-xl font-medium text-green-400">
                    All Clear!
                  </p>
                  <p className="text-sm mt-2">
                    No payments pending confirmation
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Bills will appear here when staff mark them as paid
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t-2 border-purple-500/30 safe-area-inset-bottom z-50">
        <div className="grid grid-cols-3 h-16">
          {/* POS Tab */}
          <button
            onClick={() => setActiveTab("pos")}
            className={`
              flex flex-col items-center justify-center gap-1 transition-all duration-200
              ${
                activeTab === "pos"
                  ? "text-white bg-linear-to-t from-purple-600/20 to-transparent"
                  : "text-gray-400 active:bg-gray-800/50"
              }
            `}
          >
            <ShoppingCart
              size={24}
              className={activeTab === "pos" ? "text-purple-400" : ""}
            />
            <span className="text-xs font-medium">POS</span>
          </button>

          {/* All Bills Tab */}
          <button
            onClick={() => setActiveTab("bills")}
            className={`
              flex flex-col items-center justify-center gap-1 transition-all duration-200 relative
              ${
                activeTab === "bills"
                  ? "text-white bg-linear-to-t from-purple-600/20 to-transparent"
                  : "text-gray-400 active:bg-gray-800/50"
              }
            `}
          >
            <div className="relative">
              <FileText
                size={24}
                className={activeTab === "bills" ? "text-purple-400" : ""}
              />
              {paymentBills.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {paymentBills.length}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">Bills</span>
          </button>

          {/* Confirm Tab - Only for Bartenders */}
          {canAccessConfirm && (
            <button
              onClick={() => setActiveTab("confirm")}
              className={`
                flex flex-col items-center justify-center gap-1 transition-all duration-200 relative
                ${
                  activeTab === "confirm"
                    ? "text-white bg-linear-to-t from-purple-600/20 to-transparent"
                    : "text-gray-400 active:bg-gray-800/50"
                }
              `}
            >
              <div className="relative">
                <ClipboardCheck
                  size={24}
                  className={activeTab === "confirm" ? "text-purple-400" : ""}
                />
                {awaitingConfirmation.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {awaitingConfirmation.length}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">Confirm</span>
            </button>
          )}
        </div>
      </nav>

      {/* Modals */}
      {showOpenBillsModal && (
        <OpenBillsModal
          bills={openBills}
          onSelectBill={handleSelectOpenBill}
          onClose={() => setShowOpenBillsModal(false)}
        />
      )}

      {showPaymentModal && activeBill && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handleConfirmPayment}
          billTotals={billTotals}
          canAccessConfirm={canAccessConfirm}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          loading={paymentLoading}
        />
      )}

      {showReceiptModal && activeBill && (
        <ReceiptModal
          bill={activeBill}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};

export default POSScreen;

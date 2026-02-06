import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useBills } from "../hooks/useBills";
import { usePayments } from "../hooks/usePayments";
import { useProducts } from "../hooks/useProducts";
import { useCategories } from "../hooks/useCategories";
import { useBootstrap } from "../hooks/usePOS";
import {
  ShoppingCart,
  Receipt,
  FileText,
  ClipboardCheck,
  Search,
  X,
  Plus,
  Grid as GridIcon,
} from "lucide-react";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { calculateBillTotals } from "../utils/calculations";
import toast from "react-hot-toast";
import ReceiptModal from "../components/shared/ReceiptModal";
import OpenBillsModal from "../components/bills/OpenBillsModal";
import AllBillsView from "../components/bills/AllBillsView";
import ProductGrid from "../components/products/ProductGrid";
import PaymentModal from "../components/pos/PaymentModal";
import CurrentBill from "../components/bills/CurrentBill";
import ConfirmPaymentsView from "../components/pos/ConfirmPaymentsView";

const POSScreen = () => {
  const { user } = useAuth();
  // const {
  //   products,
  //   isLoading: productsLoading,
  //   reload: productsReload,
  // } = useProducts();
  // const { categories, isLoading: categoriesLoading } = useCategories();
  // const {
  //   openBill: startABill,
  //   addRound: addRoundToBill,
  //   cancelBill,
  //   isLoading: billsLoading,
  // } = useBills();
  // const {
  //   bills: paymentBills,
  //   processPayment,
  //   reloadBills,
  //   isLoading: paymentsLoading,
  // } = usePayments();

  const { loading: posLoading, posData } = useBootstrap();

  useEffect(() => {
    console.log(posData);
  }, [posData]);

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
        p.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  }, [products, selectedCategory, searchTerm]);

  // Bills awaiting confirmation
  const awaitingConfirmation = useMemo(() => {
    return paymentBills.filter(
      (bill) => bill.status === "awaiting_confirmation",
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
            : item,
        ),
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
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveItem = (itemId) => {
    setCurrentRoundItems(
      currentRoundItems.filter((item) => item.id !== itemId),
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
      await Promise.all([productsReload(), reloadBills(), handleCloseView()]);
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
      `Are you sure you want to VOID this bill for ${activeBill.customer_name}?\n\nThis action cannot be undone and will permanently delete this bill.`,
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

  const handleProcessPayment = async (bill) => {
    setPaymentLoading(true);
    try {
      const totals = calculateBillTotals(bill);

      if (!totals || totals.total <= 0) {
        throw new Error("Invalid bill total");
      }

      // Safety net to prevent silent fails
      if (!bill?.id || !bill?.rounds?.length) {
        throw new Error("Invalid bill for payment");
      }

      await processPayment(bill.id, {
        paymentMethod,
        amount: totals.total,
      });

      user.role === "bartender"
        ? toast.success("Payment processed successfully.")
        : toast.success("Payment processed. Awaiting Confirmation.");

      setShowPaymentModal(false);
      setActiveBill(null);
      setCurrentRoundItems([]);
      await reloadBills();
    } catch (error) {
      toast.error(error.message || "Failed to process payment");
      console.error(error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const billTotals = activeBill ? calculateBillTotals(activeBill) : null;

  if (
    productsLoading ||
    categoriesLoading ||
    billsLoading ||
    paymentsLoading ||
    posLoading
  ) {
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
              <span>SALE</span>
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
          <div className="h-screen flex overflow-hidden">
            {/* LEFT COLUMN - Category Side Panel for Large Screens */}
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
                  {categories
                    .filter((c) => c.active == true)
                    .map((cat) => (
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

            {/* CENTER COLUMN - Products Section with Fixed Search */}
            <div className="flex-1 flex flex-col overflow-hidden lg:border-r lg:border-purple-500/20">
              {/* Fixed Search Bar */}
              <div className="shrink-0 p-4 border-b border-purple-500/20 bg-gray-900/20">
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
              </div>

              {/* Scrollable Products Grid */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                <ProductGrid
                  products={filteredProducts}
                  onProductClick={handleAddProduct}
                  disabled={!activeBill}
                />
              </div>
            </div>

            {/* RIGHT COLUMN - Current Bill Section */}
            <div className="hidden lg:block w-96 xl:w-md bg-gray-900/20 max-h-screen overflow-hidden">
              <div className="h-full overflow-y-auto">
                <CurrentBill
                  bill={activeBill}
                  onClose={handleCloseView}
                  currentRoundItems={currentRoundItems}
                  onRemoveItem={handleRemoveItem}
                  onUpdateQuantity={handleUpdateQuantity}
                  onAddRound={handleAddRound}
                  onOpenPayment={handleOpenPaymentModal}
                  onVoidBill={handleVoidBill}
                  onShowReceipt={() => setShowReceiptModal(true)}
                />
              </div>
            </div>

            {/* Mobile Current Bill - Shows as overlay/modal */}
            {activeBill && (
              <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-end">
                <div className="w-full max-h-[80vh] bg-gray-900 rounded-t-2xl border-t-2 border-purple-500/30 overflow-hidden">
                  <CurrentBill
                    bill={activeBill}
                    onClose={handleCloseView}
                    currentRoundItems={currentRoundItems}
                    onRemoveItem={handleRemoveItem}
                    onUpdateQuantity={handleUpdateQuantity}
                    onAddRound={handleAddRound}
                    onOpenPayment={handleOpenPaymentModal}
                    onVoidBill={handleVoidBill}
                    onShowReceipt={() => setShowReceiptModal(true)}
                  />
                </div>
              </div>
            )}
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
            <ConfirmPaymentsView
              awaitingConfirmation={awaitingConfirmation}
              canAccessConfirm={canAccessConfirm}
              onProcessPayment={handleProcessPayment}
            />
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
          onConfirm={() => handleProcessPayment(activeBill)}
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

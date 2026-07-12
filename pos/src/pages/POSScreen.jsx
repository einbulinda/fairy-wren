import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useBills } from "../hooks/useBills";
import { useProducts } from "../hooks/useProducts";
import { useCategories } from "../hooks/useCategories";
import { PaymentService } from "@/services/payment.service";
import {
  ShoppingCart,
  Search,
  X,
  Plus,
  Grid as GridIcon,
  AlertTriangle,
  RefreshCw,
  User,
  Receipt,
  ChevronUp,
} from "lucide-react";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import {
  calculateBillTotals,
  calculateBillPaymentInfo,
} from "../utils/calculations";
import toast from "react-hot-toast";
import ReceiptModal from "../components/shared/ReceiptModal";
import OpenBillsModal from "../components/bills/OpenBillsModal";
import ProductGrid from "../components/products/ProductGrid";
import PaymentModal from "../components/pos/PaymentModal";
import CurrentBill from "../components/bills/CurrentBill";
import ConfirmPaymentsView from "../components/pos/ConfirmPaymentsView";
import ConfirmModal from "../components/shared/ConfirmModal";
import ExchangeModal from "../components/bills/ExchangeModal";
import CustomerBillsView from "../components/bills/CustomerBillsView";

// subView: "sale" | "customer-bills" | "confirm-payments"
const POSScreen = ({ subView = "sale", onSwitchToSale }) => {
  const { user } = useAuth();
  const {
    products,
    loading: productsLoading,
    refetch: refetchProducts,
  } = useProducts({ active: true });
  const { categories, loading: categoriesLoading } = useCategories({
    active: true,
  });
  const {
    bills,
    setBills,
    createBill,
    voidBill,
    addRound: addRoundService,
    exchangeItem: exchangeItemService,
    reload: reloadBills,
    loading: billsLoading,
    error: billsError,
  } = useBills();

  const openBills = useMemo(
    () => bills.filter((b) => b.status === "open"),
    [bills],
  );
  const myOpenBills = useMemo(
    () => openBills.filter((b) => b.created_by_user?.id === user?.id),
    [openBills, user?.id],
  );
  const confirmPaidBills = useMemo(
    () => bills.filter((b) => b.status === "awaiting_confirmation"),
    [bills],
  );

  const canAccessConfirm = user?.permissions?.includes("approve_payments");

  // POS state
  const [activeBill, setActiveBill] = useState(null);
  const [currentRoundItems, setCurrentRoundItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Bill peek/expand sheet state
  const [billSheetExpanded, setBillSheetExpanded] = useState(false);

  // Operation states
  const [addingRound, setAddingRound] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showOpenBillsModal, setShowOpenBillsModal] = useState(false);
  const [showNewBillModal, setShowNewBillModal] = useState(false);
  const [newBillCustomerName, setNewBillCustomerName] = useState("");
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showMyBillsModal, setShowMyBillsModal] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeLoading, setExchangeLoading] = useState(false);

  useEffect(() => {
    if (billsError?.message) toast.error(billsError.message);
  }, [billsError]);

  // Collapse sheet whenever a different bill becomes active
  useEffect(() => {
    setBillSheetExpanded(false);
  }, [activeBill?.id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([reloadBills(), refetchProducts()]);
      toast.success("Refreshed");
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }, [reloadBills, refetchProducts]);

  const getCurrentRoundQuantity = useCallback(
    (productId) => currentRoundItems.find((i) => i.id === productId)?.quantity || 0,
    [currentRoundItems],
  );

  const stockWarnings = useMemo(() => {
    if (!activeBill) return {};
    return currentRoundItems.reduce((warnings, item) => {
      const product = products.find((p) => p.id === item.id);
      if (!product || typeof product.current_stock !== "number") return warnings;
      const qty = getCurrentRoundQuantity(item.id);
      if (qty > product.current_stock) {
        warnings[item.id] = {
          message: `⚠️ Exceeds available stock (${product.current_stock})`,
          severity: "error",
        };
      } else if (product.reorder_level > 0 && product.current_stock <= product.reorder_level) {
        warnings[item.id] = {
          message: `⚠️ Low stock (${product.current_stock} left, ROL: ${product.reorder_level})`,
          severity: "warning",
        };
      }
      return warnings;
    }, {});
  }, [currentRoundItems, activeBill, products, getCurrentRoundQuantity]);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) => !p.track_inventory || p.current_stock > 0);
    if (selectedCategory !== "all")
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    if (debouncedSearchTerm)
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
      );
    return filtered;
  }, [products, selectedCategory, debouncedSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleStartNewBill = () => {
    setNewBillCustomerName("");
    setShowNewBillModal(true);
  };

  const handleCreateNewBill = useCallback(async () => {
    if (!newBillCustomerName.trim()) {
      toast.error("Please enter customer name");
      return;
    }
    setIsCreatingBill(true);
    try {
      const newBill = await createBill({ customer_name: newBillCustomerName.trim() });
      setActiveBill(newBill);
      setCurrentRoundItems([]);
      setShowNewBillModal(false);
      toast.success(`Bill created for ${newBill.customer_name}`);
      await reloadBills();
    } catch (error) {
      toast.error("Failed to create bill");
      console.error(error);
    } finally {
      setIsCreatingBill(false);
    }
  }, [newBillCustomerName, createBill, reloadBills]);

  const handleSelectOpenBill = (bill) => {
    setActiveBill(bill);
    setCurrentRoundItems([]);
    setShowOpenBillsModal(false);
    toast.success(`Switched to ${bill.customer_name}'s bill`);
  };

  const handleJumpToBill = useCallback((bill) => {
    setActiveBill(bill);
    setCurrentRoundItems([]);
    onSwitchToSale?.();
    toast.success(`Opened ${bill.customer_name}'s bill`);
  }, [onSwitchToSale]);

  const handleAddProduct = useCallback(
    (product) => {
      if (!activeBill) {
        toast.error("Please start or select an open bill first");
        return;
      }
      if (typeof product.current_stock === "number" && product.current_stock >= 0) {
        const inRound = getCurrentRoundQuantity(product.id);
        if (inRound + 1 > product.current_stock) {
          toast.error(
            `Only ${product.current_stock} unit${product.current_stock === 1 ? "" : "s"} of "${product.name}" available.`,
            { duration: 4000 },
          );
          return;
        }
      }
      const existing = currentRoundItems.find((item) => item.id === product.id);
      if (existing) {
        setCurrentRoundItems(
          currentRoundItems.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        );
      } else {
        setCurrentRoundItems([
          ...currentRoundItems,
          { id: product.id, productName: product.name, price: product.price, quantity: 1 },
        ]);
      }
    },
    [activeBill, currentRoundItems, getCurrentRoundQuantity],
  );

  const handleUpdateQuantity = useCallback(
    (itemId, delta) => {
      if (delta > 0) {
        const product = products.find((p) => p.id === itemId);
        if (product && typeof product.current_stock === "number" && product.current_stock >= 0) {
          if (getCurrentRoundQuantity(itemId) + delta > product.current_stock) {
            toast.error(
              `Insufficient stock for "${product.name}".\nAvailable: ${product.current_stock}`,
              { duration: 4000 },
            );
            return;
          }
        }
      }
      setCurrentRoundItems((items) =>
        items
          .map((item) =>
            item.id === itemId
              ? { ...item, quantity: Math.max(0, item.quantity + delta) }
              : item,
          )
          .filter((item) => item.quantity > 0),
      );
    },
    [products, getCurrentRoundQuantity],
  );

  const handleRemoveItem = useCallback(
    (itemId) => setCurrentRoundItems((items) => items.filter((item) => item.id !== itemId)),
    [],
  );

  const handleAddRound = useCallback(async () => {
    if (currentRoundItems.length === 0) { toast.error("Add items to the round first"); return; }
    if (!activeBill) { toast.error("No active bill selected"); return; }

    const invalidItem = currentRoundItems.find((item) => {
      const product = products.find((p) => p.id === item.id);
      return product && typeof product.current_stock === "number" && item.quantity > product.current_stock;
    });
    if (invalidItem) {
      const product = products.find((p) => p.id === invalidItem.id);
      toast.error(
        `Cannot add round: "${product.name}" exceeds available stock (${product.current_stock}).`,
        { duration: 5000, icon: <AlertTriangle className="text-yellow-400" /> },
      );
      return;
    }

    setAddingRound(true);
    const optimisticRound = {
      id: `tmp-${crypto.randomUUID()}`,
      created_at: new Date().toISOString(),
      items: currentRoundItems.map((item) => ({
        product_id: item.id, name: item.productName, price: item.price, quantity: item.quantity,
      })),
      optimistic: true,
    };
    const optimisticBill = { ...activeBill, rounds: [...(activeBill.rounds || []), optimisticRound] };
    setActiveBill(optimisticBill);
    setBills((prev) => prev.map((b) => (b.id === activeBill.id ? optimisticBill : b)));
    setCurrentRoundItems([]);

    try {
      const updatedBill = await addRoundService(activeBill.id, { items: currentRoundItems });
      setActiveBill(updatedBill);
      setBills((prev) => prev.map((b) => (b.id === updatedBill.id ? updatedBill : b)));
      toast.success("Round added to bill!", { icon: "✅" });
      setBillSheetExpanded(false);
      await reloadBills();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to add round.";
      toast.error(errorMsg, { duration: 5000 });
      setActiveBill(activeBill);
      setBills((prev) => prev.map((b) => (b.id === activeBill.id ? activeBill : b)));
      setCurrentRoundItems(currentRoundItems);
    } finally {
      setAddingRound(false);
    }
  }, [activeBill, currentRoundItems, products, addRoundService, setBills, reloadBills]);

  const handleCloseView = () => {
    if (currentRoundItems.length > 0) { setShowCloseConfirm(true); return; }
    setActiveBill(null);
    setCurrentRoundItems([]);
  };

  const confirmCloseView = () => {
    setShowCloseConfirm(false);
    setActiveBill(null);
    setCurrentRoundItems([]);
  };

  const handleVoidBill = useCallback(() => {
    if (activeBill) setShowVoidConfirm(true);
  }, [activeBill]);

  const confirmVoidBill = useCallback(async () => {
    setShowVoidConfirm(false);
    if (!activeBill) return;
    try {
      await voidBill(activeBill.id);
      toast.success(`Bill for ${activeBill.customer_name} has been voided`);
      await reloadBills();
      setActiveBill(null);
      setCurrentRoundItems([]);
    } catch (error) {
      toast.error("Failed to void bill");
      console.error(error);
    }
  }, [activeBill, reloadBills, voidBill]);

  const handleExchangeItem = useCallback(async (payload) => {
    if (!activeBill) return;
    setExchangeLoading(true);
    try {
      await exchangeItemService(activeBill.id, payload);
      const freshBill = bills.find((b) => b.id === activeBill.id);
      if (freshBill) setActiveBill(freshBill);
      setShowExchangeModal(false);
      toast.success("Item exchanged successfully");
    } catch (error) {
      toast.error(error?.error?.message || error?.message || "Failed to exchange item");
    } finally {
      setExchangeLoading(false);
    }
  }, [activeBill, bills, exchangeItemService]);

  const handleOpenPaymentModal = useCallback(() => {
    if (currentRoundItems.length > 0) { toast.error("Please add current round before payment"); return; }
    if (!activeBill || !activeBill.rounds?.length) { toast.error("Cannot process payment for empty bill"); return; }
    setShowPaymentModal(true);
  }, [activeBill, currentRoundItems.length]);

  const handleProcessPayment = async (bill, paymentLines) => {
    setPaymentLoading(true);
    try {
      if (!bill?.id || !bill?.rounds?.length) throw new Error("Invalid bill for payment");
      const { data } = await PaymentService.process({ billId: bill.id, payments: paymentLines });
      if (data?.balance_due > 0) {
        toast.success(`Partial payment recorded. Remaining: KSh ${data.balance_due.toLocaleString()}`);
      } else {
        toast.success(
          canAccessConfirm ? "Payment processed successfully." : "Payment processed. Awaiting Confirmation.",
        );
      }
      reloadBills();
      setShowPaymentModal(false);
      setActiveBill(null);
      setCurrentRoundItems([]);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to process payment");
      console.error(error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleConfirmPayment = async (bill) => {
    setPaymentLoading(true);
    try {
      const { data } = await PaymentService.process({ billId: bill.id, payments: [] });
      if (data?.balance_due > 0) {
        toast.success(`Payments confirmed. Remaining: KSh ${data.balance_due.toLocaleString()}`);
      } else {
        toast.success("Payments confirmed and bill completed.");
      }
      reloadBills();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to confirm payment");
      console.error(error);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (productsLoading || categoriesLoading || billsLoading) return <LoadingSpinner />;

  return (
    <div className="h-full flex flex-col">

      {/* ── Action bar (sale view only) ── */}
      {/* order-last on mobile → sticks to bottom; lg:order-first → back to top on desktop */}
      {subView === "sale" && (
        <div className="shrink-0 order-last lg:order-first bg-gray-900/95 lg:bg-gray-900/40 backdrop-blur-md border-t border-purple-500/20 lg:border-t-0 lg:border-b">

          {/* ── Mobile: native-style icon tab bar ── */}
          <div className="lg:hidden flex divide-x divide-gray-700/40">
            {/* New Bill */}
            <button
              onClick={handleStartNewBill}
              disabled={isCreatingBill}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 active:bg-gray-800/70 transition-colors disabled:opacity-50"
            >
              {isCreatingBill
                ? <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                : <Plus size={24} className="text-green-400" strokeWidth={2.5} />
              }
              <span className="text-[10px] font-semibold text-green-400 tracking-wide">New Bill</span>
            </button>

            {/* Bills */}
            <button
              onClick={() => setShowOpenBillsModal(true)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 active:bg-gray-800/70 transition-colors"
            >
              <div className="relative">
                <Receipt size={22} className="text-blue-400" />
                {openBills.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-blue-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">
                    {openBills.length > 99 ? "99+" : openBills.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-blue-400 tracking-wide">Bills</span>
            </button>

            {/* Mine */}
            <button
              onClick={() => setShowMyBillsModal(true)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 active:bg-gray-800/70 transition-colors"
            >
              <div className="relative">
                <User size={22} className="text-purple-400" />
                {myOpenBills.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-purple-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">
                    {myOpenBills.length > 99 ? "99+" : myOpenBills.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-purple-400 tracking-wide">Mine</span>
            </button>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 active:bg-gray-800/70 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={22} className={`text-gray-400 ${refreshing ? "animate-spin" : ""}`} />
              <span className="text-[10px] font-semibold text-gray-500 tracking-wide">Refresh</span>
            </button>
          </div>

          {/* ── Desktop: text button row ── */}
          <div className="hidden lg:flex gap-2 px-3 py-2">
            <button
              onClick={handleStartNewBill}
              disabled={isCreatingBill}
              className="flex-none px-4 py-2.5 bg-linear-to-r from-green-600 to-emerald-600 active:from-green-700 active:to-emerald-700 rounded-lg font-semibold transition-all flex items-center gap-2 text-sm shadow-lg shadow-green-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreatingBill
                ? <><div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />Creating...</>
                : <><Plus size={18} />New Bill</>
              }
            </button>
            <button
              onClick={() => setShowOpenBillsModal(true)}
              className="flex-1 px-3 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 active:from-blue-700 active:to-indigo-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/20"
            >
              <Receipt size={16} />Open Bills ({openBills.length})
            </button>
            <button
              onClick={() => setShowMyBillsModal(true)}
              className="flex-none px-3 py-2.5 bg-linear-to-r from-purple-600 to-violet-600 active:from-purple-700 active:to-violet-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-purple-500/20"
            >
              <User size={16} />My Bills ({myOpenBills.length})
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2.5 bg-gray-700 active:bg-gray-600 rounded-lg transition-all flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* Sale view */}
        {subView === "sale" && (
          <div className="h-full flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT: category sidebar (desktop) */}
            <aside className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-purple-500/20 bg-gray-900/20 shrink-0 overflow-hidden">
              <div className="shrink-0 p-4 border-b border-purple-500/20">
                <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  Categories
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`col-span-2 text-center px-3 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm ${
                      selectedCategory === "all"
                        ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                        : "bg-gray-800/40 border border-purple-500/20 text-gray-300 hover:text-white hover:bg-gray-800/60"
                    }`}
                  >
                    <GridIcon size={16} />
                    <span>All Products</span>
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`text-center px-2 py-3 rounded-lg transition-all duration-200 font-medium text-sm ${
                        selectedCategory === cat.id
                          ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                          : "bg-gray-800/40 border border-purple-500/20 text-gray-300 hover:text-white hover:bg-gray-800/60"
                      }`}
                    >
                      <span className="block truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* CENTER + MOBILE */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
              {/* Category strip (mobile/tablet) */}
              <div className="lg:hidden shrink-0 border-b border-purple-500/20 bg-gray-900/20 relative">
                {/* Right-edge fade to hint at scrollable content */}
                <div className="pointer-events-none absolute right-0 inset-y-0 w-8 bg-linear-to-l from-gray-900/90 to-transparent z-10" />
                <div
                  className="overflow-x-auto px-3 py-3"
                  style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
                >
                  <div className="flex gap-2 min-w-max">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      style={{ scrollSnapAlign: "start" }}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 text-sm font-medium flex items-center gap-2 active:scale-95 ${
                        selectedCategory === "all"
                          ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                          : "bg-gray-800/60 text-gray-300"
                      }`}
                    >
                      <GridIcon size={14} />
                      All Products
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        style={{ scrollSnapAlign: "start" }}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 text-sm font-medium active:scale-95 ${
                          selectedCategory === cat.id
                            ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                            : "bg-gray-800/60 text-gray-300"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Products: search + grid */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden lg:border-r lg:border-purple-500/20">
                <div className="shrink-0 p-4 border-b border-purple-500/20 bg-gray-900/20">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Quick search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setSearchTerm("");
                        if (e.key === "Enter" && filteredProducts.length > 0)
                          handleAddProduct(filteredProducts[0]);
                      }}
                      className="w-full pl-11 pr-11 py-3 rounded-xl bg-gray-900/60 backdrop-blur-md border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-base"
                      aria-label="Search products"
                    />
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400"
                      size={20}
                      aria-hidden="true"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        aria-label="Clear search"
                      >
                        <X size={20} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                  <ProductGrid
                    products={filteredProducts}
                    onProductClick={handleAddProduct}
                    disabled={!activeBill}
                  />
                </div>
              </div>

              {/* Mobile bill sheet — peek (64px) or expanded (82%) */}
              {activeBill && (
                <>
                  {billSheetExpanded && (
                    <div
                      className="lg:hidden absolute inset-0 bg-black/50 z-10"
                      onClick={() => setBillSheetExpanded(false)}
                    />
                  )}
                  <div
                    className="lg:hidden absolute inset-x-0 bottom-0 z-20 bg-gray-900 border-t-2 border-purple-500/30 flex flex-col overflow-hidden"
                    style={{
                      height: billSheetExpanded ? "82%" : "64px",
                      transition: "height 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                    }}
                  >
                    {/* Peek row — always visible */}
                    <div className="shrink-0 h-16 flex items-center relative">
                      {/* Drag pill */}
                      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gray-700 pointer-events-none" />

                      {/* Close bill */}
                      <button
                        onClick={handleCloseView}
                        className="w-12 h-full flex items-center justify-center text-gray-500 active:text-white transition-colors shrink-0"
                        aria-label="Close bill"
                      >
                        <X size={18} />
                      </button>

                      {/* Expand/collapse trigger */}
                      <button
                        onClick={() => setBillSheetExpanded((v) => !v)}
                        className="flex-1 h-full flex items-center gap-2.5 pr-3 min-w-0"
                      >
                        <span className="flex-1 min-w-0 text-sm font-semibold text-white text-left truncate">
                          {activeBill.customer_name}
                        </span>
                        {currentRoundItems.length > 0 && (
                          <span className="shrink-0 bg-purple-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                            {currentRoundItems.length}
                          </span>
                        )}
                        <span className="shrink-0 text-sm font-bold text-pink-400 font-mono">
                          KSh {(
                            (calculateBillTotals(activeBill)?.subtotal ?? 0) +
                            currentRoundItems.reduce((s, i) => s + i.price * i.quantity, 0)
                          ).toLocaleString()}
                        </span>
                        <ChevronUp
                          size={16}
                          className={`shrink-0 text-gray-400 transition-transform duration-300 ${
                            billSheetExpanded ? "" : "rotate-180"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Full bill — visible when expanded */}
                    <div className="flex-1 min-h-0 overflow-hidden">
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
                        onExchangeItem={() => setShowExchangeModal(true)}
                        isAddingRound={addingRound}
                        stockWarnings={stockWarnings}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* RIGHT: bill panel (desktop) */}
            <div className="hidden lg:flex lg:flex-col w-96 xl:w-[420px] bg-gray-900/20 shrink-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto">
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
                  onExchangeItem={() => setShowExchangeModal(true)}
                  isAddingRound={addingRound}
                  stockWarnings={stockWarnings}
                />
              </div>
            </div>
          </div>
        )}

        {/* Confirm Payments view */}
        {subView === "confirm-payments" && (
          <div className="p-4 overflow-y-auto h-full">
            <ConfirmPaymentsView
              awaitingConfirmation={confirmPaidBills}
              canAccessConfirm={canAccessConfirm}
              onProcessPayment={handleConfirmPayment}
            />
          </div>
        )}

        {/* Customer Bills view */}
        {subView === "customer-bills" && (
          <CustomerBillsView bills={bills} onJumpToBill={handleJumpToBill} />
        )}
      </div>

      {/* ── Modals ── */}
      {showOpenBillsModal && (
        <OpenBillsModal
          bills={openBills}
          onSelectBill={handleSelectOpenBill}
          onClose={() => setShowOpenBillsModal(false)}
        />
      )}

      {showMyBillsModal && (
        <OpenBillsModal
          bills={myOpenBills}
          onSelectBill={handleSelectOpenBill}
          onClose={() => setShowMyBillsModal(false)}
          title="My Open Bills"
        />
      )}

      {showPaymentModal && activeBill && (() => {
        const paymentInfo = calculateBillPaymentInfo(activeBill);
        return (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            onSubmitPayments={(lines) => handleProcessPayment(activeBill, lines)}
            billTotal={paymentInfo.total}
            balanceDue={paymentInfo.balanceDue}
            amountPaid={paymentInfo.amountPaid}
            canAccessConfirm={canAccessConfirm}
            loading={paymentLoading}
          />
        );
      })()}

      {showReceiptModal && activeBill && (
        <ReceiptModal bill={activeBill} onClose={() => setShowReceiptModal(false)} />
      )}

      {showExchangeModal && activeBill && (
        <ExchangeModal
          bill={activeBill}
          products={products}
          onExchange={handleExchangeItem}
          onClose={() => setShowExchangeModal(false)}
          loading={exchangeLoading}
        />
      )}

      {showVoidConfirm && activeBill && (
        <ConfirmModal
          title="Void Bill"
          message={`Are you sure you want to void the bill for ${activeBill.customer_name}? This action cannot be undone.`}
          confirmLabel="Void Bill"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={confirmVoidBill}
          onCancel={() => setShowVoidConfirm(false)}
        />
      )}

      {showCloseConfirm && (
        <ConfirmModal
          title="Discard Round Items?"
          message="You have unsaved items in the current round. Close the bill view without adding them?"
          confirmLabel="Discard & Close"
          cancelLabel="Keep Editing"
          variant="warning"
          onConfirm={confirmCloseView}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}

      {showNewBillModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Create New Bill</h2>
            <p className="text-sm text-gray-400 mb-6">Enter customer name or table number</p>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Customer name or table number"
                value={newBillCustomerName}
                onChange={(e) => setNewBillCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newBillCustomerName.trim()) handleCreateNewBill();
                  if (e.key === "Escape") setShowNewBillModal(false);
                }}
                autoFocus
                disabled={isCreatingBill}
                className="w-full px-4 py-3 bg-gray-800/60 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
                aria-label="Customer name"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewBillModal(false)}
                  disabled={isCreatingBill}
                  className="flex-1 px-4 py-3 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewBill}
                  disabled={!newBillCustomerName.trim() || isCreatingBill}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    !newBillCustomerName.trim() || isCreatingBill
                      ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                      : "bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                  }`}
                >
                  {isCreatingBill ? (
                    <><div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />Creating...</>
                  ) : (
                    <><Plus size={18} />Create Bill</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSScreen;

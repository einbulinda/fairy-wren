import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useBills } from "../hooks/useBills";
import { useProducts } from "../hooks/useProducts";
import { useCategories } from "../hooks/useCategories";
import { PaymentService } from "@/services/payment.service";
import {
  ShoppingCart,
  Receipt,
  ClipboardCheck,
  Search,
  X,
  Plus,
  Grid as GridIcon,
  AlertTriangle,
  RefreshCw,
  User,
} from "lucide-react";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { calculateBillTotals } from "../utils/calculations";
import toast from "react-hot-toast";
import ReceiptModal from "../components/shared/ReceiptModal";
import OpenBillsModal from "../components/bills/OpenBillsModal";
import ProductGrid from "../components/products/ProductGrid";
import PaymentModal from "../components/pos/PaymentModal";
import CurrentBill from "../components/bills/CurrentBill";
import ConfirmPaymentsView from "../components/pos/ConfirmPaymentsView";

const POSScreen = () => {
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

  // Tab state
  const [activeTab, setActiveTab] = useState("pos"); // 'pos', 'bills', 'confirm'

  // POS state
  const [activeBill, setActiveBill] = useState(null);
  const [currentRoundItems, setCurrentRoundItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Operation states
  const [addingRound, setAddingRound] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Modals
  const [showOpenBillsModal, setShowOpenBillsModal] = useState(false);
  const [showNewBillModal, setShowNewBillModal] = useState(false);
  const [newBillCustomerName, setNewBillCustomerName] = useState("");
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [showMyBillsModal, setShowMyBillsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  // Permission checks
  const canAccessConfirm = user?.permissions?.includes("approve_payments");

  // 🔒 CRITICAL: Helper to calculate TOTAL quantity across ENTIRE bill + current round
  const getTotalQuantityInBill = useCallback(
    (productId) => {
      if (!activeBill) return 0;

      // Sum quantities from ALL rounds in bill (including optimistic updates)
      const fromRounds = (activeBill.rounds || []).reduce((sum, round) => {
        if (!round.items) return sum;
        const item = round.items.find(
          (i) => i.product_id === productId || i.id === productId,
        );
        return sum + (item?.quantity || 0);
      }, 0);

      // Add current round items
      const fromCurrentRound =
        currentRoundItems.find((i) => i.id === productId)?.quantity || 0;

      return fromRounds + fromCurrentRound;
    },
    [activeBill, currentRoundItems],
  );

  // 🔒 Compute stock warnings for current round items
  const stockWarnings = useMemo(() => {
    if (!activeBill) return {};

    return currentRoundItems.reduce((warnings, item) => {
      const product = products.find((p) => p.id === item.id);
      if (!product || typeof product.current_stock !== "number")
        return warnings;

      const totalInBill = getTotalQuantityInBill(item.id);
      if (totalInBill > product.current_stock) {
        warnings[item.id] = {
          message: `⚠️ Exceeds available stock (${product.current_stock})`,
          severity: "error",
        };
      } else if (product.current_stock <= 3) {
        warnings[item.id] = {
          message: `⚠️ Low stock (${product.current_stock} left)`,
          severity: "warning",
        };
      }
      return warnings;
    }, {});
  }, [currentRoundItems, activeBill, products, getTotalQuantityInBill]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Hide out-of-stock items (skip for non-tracked inventory)
    filtered = filtered.filter(
      (p) => !p.track_inventory || p.current_stock > 0,
    );

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    if (debouncedSearchTerm) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
      );
    }

    return filtered;
  }, [products, selectedCategory, debouncedSearchTerm]);

  // 📱 MOBILE: Lock body scroll when bill modal is open
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (activeBill && isMobile) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [activeBill]);

  // ⚡ SEARCH DEBOUNCE: Wait 300ms after user stops typing before filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // POS Functions
  const handleStartNewBill = () => {
    setNewBillCustomerName("");
    setShowNewBillModal(true);
  };

  // Create bill from modal
  const handleCreateNewBill = useCallback(async () => {
    if (!newBillCustomerName.trim()) {
      toast.error("Please enter customer name");
      return;
    }

    setIsCreatingBill(true);
    try {
      const newBill = await createBill({
        customer_name: newBillCustomerName.trim(),
      });

      setActiveBill(newBill);
      setCurrentRoundItems([]);
      setShowNewBillModal(false);
      toast.success(`Bill created for ${newBill.customer_name}`);

      // Refresh open bills list to ensure it's current
      await reloadBills();
    } catch (error) {
      toast.error("Failed to create bill");
      console.error(error);
    } finally {
      setIsCreatingBill(false);
    }
  }, [newBillCustomerName, createBill, reloadBills]);

  // Select an OPEN bill from modal
  const handleSelectOpenBill = (bill) => {
    setActiveBill(bill);
    setCurrentRoundItems([]);
    setShowOpenBillsModal(false);
    toast.success(`Switched to ${bill.customer_name}'s bill`);
  };

  const handleAddProduct = useCallback(
    (product) => {
      if (!activeBill) {
        toast.error("Please start or select an open bill first");
        return;
      }

      // 🔒 VALIDATE AGAINST ENTIRE BILL + CURRENT ROUND
      if (
        typeof product.current_stock === "number" &&
        product.current_stock >= 0
      ) {
        const totalInBill = getTotalQuantityInBill(product.id);
        const newTotal = totalInBill + 1;

        if (newTotal > product.current_stock) {
          const alreadyText =
            totalInBill > 0
              ? `\nBill already contains ${totalInBill} unit${totalInBill === 1 ? "" : "s"}`
              : "";

          toast.error(
            `Only ${product.current_stock} unit${product.current_stock === 1 ? "" : "s"} of "${product.name}" available.${alreadyText}\nCannot add more to this bill.`,
            { duration: 4000 },
          );
          return;
        }
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
    },
    [activeBill, currentRoundItems, getTotalQuantityInBill],
  );

  const handleUpdateQuantity = useCallback(
    (itemId, delta) => {
      // 🔒 VALIDATE INCREASES AGAINST ENTIRE BILL
      if (delta > 0) {
        const product = products.find((p) => p.id === itemId);
        if (
          product &&
          typeof product.current_stock === "number" &&
          product.current_stock >= 0
        ) {
          const totalInBill = getTotalQuantityInBill(itemId);
          // Current round quantity is already included in totalInBill
          // New total would be: totalInBill (current state) + delta
          if (totalInBill + delta > product.current_stock) {
            toast.error(
              `Insufficient stock for "${product.name}".\nAvailable: ${product.current_stock} | Already in bill: ${totalInBill}`,
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
    [products, getTotalQuantityInBill],
  );

  const handleRemoveItem = useCallback((itemId) => {
    setCurrentRoundItems((items) => items.filter((item) => item.id !== itemId));
  }, []);

  const handleAddRound = useCallback(async () => {
    if (currentRoundItems.length === 0) {
      toast.error("Add items to the round first");
      return;
    }

    if (!activeBill) {
      toast.error("No active bill selected");
      return;
    }

    // 🔒 FINAL VALIDATION BEFORE SUBMIT
    const invalidItem = currentRoundItems.find((item) => {
      const product = products.find((p) => p.id === item.id);
      if (!product || typeof product.current_stock !== "number") return false;

      const totalInBill = getTotalQuantityInBill(item.id);
      return totalInBill > product.current_stock;
    });

    if (invalidItem) {
      const product = products.find((p) => p.id === invalidItem.id);
      toast.error(
        `Cannot add round: "${product.name}" exceeds available stock (${product.current_stock}).\nPlease adjust quantities.`,
        { duration: 5000, icon: <AlertTriangle className="text-yellow-400" /> },
      );
      return;
    }

    setAddingRound(true);

    // 1️⃣ Create optimistic round
    const optimisticRound = {
      id: `tmp-${crypto.randomUUID()}`,
      created_at: new Date().toISOString(),
      items: currentRoundItems.map((item) => ({
        product_id: item.id,
        name: item.productName,
        price: item.price,
        quantity: item.quantity,
      })),
      optimistic: true,
    };

    // 2️⃣ Optimistically update active bill
    const optimisticBill = {
      ...activeBill,
      rounds: [...(activeBill.rounds || []), optimisticRound],
    };

    setActiveBill(optimisticBill);
    setBills((prev) =>
      prev.map((b) => (b.id === activeBill.id ? optimisticBill : b)),
    );
    setCurrentRoundItems([]);

    try {
      // 3️⃣ Persist to backend
      const updatedBill = await addRoundService(activeBill.id, {
        items: currentRoundItems,
      });

      // 4️⃣ Replace optimistic bill with real one
      setActiveBill(updatedBill);
      setBills((prev) =>
        prev.map((b) => (b.id === updatedBill.id ? updatedBill : b)),
      );

      toast.success("Round added to bill!", { icon: "✅" });

      // Refresh open bills list to ensure it's current
      await reloadBills();
    } catch (error) {
      console.error("Round addition failed:", error);

      // 🎯 Show specific backend error if available
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to add round. Reverting changes.";

      toast.error(errorMsg, { duration: 5000 });

      // 5️⃣ Roll back optimistic update
      setActiveBill(activeBill);
      setBills((prev) =>
        prev.map((b) => (b.id === activeBill.id ? activeBill : b)),
      );
      setCurrentRoundItems(currentRoundItems); // Restore items
    } finally {
      setAddingRound(false);
    }
  }, [
    activeBill,
    currentRoundItems,
    products,
    addRoundService,
    setBills,
    reloadBills,
    getTotalQuantityInBill,
  ]);

  const handleCloseView = () => {
    if (currentRoundItems.length > 0) {
      const confirmed = window.confirm(
        "You have unsaved items in the current round.\nAre you sure you want to close without adding them to the bill?",
      );
      if (!confirmed) return;
    }
    setActiveBill(null);
    setCurrentRoundItems([]);
  };

  const handleVoidBill = useCallback(async () => {
    if (!activeBill) return;

    const confirmed = window.confirm(
      `Are you sure you want to VOID this bill for ${activeBill.customer_name}?\n\nThis action cannot be undone and will permanently delete this bill.`,
    );

    if (!confirmed) return;

    try {
      await voidBill(activeBill.id);
      toast.success(`Bill for ${activeBill.customer_name} has been voided`);

      // Refresh bills list
      await reloadBills();

      setActiveBill(null);
      setCurrentRoundItems([]);
    } catch (error) {
      toast.error("Failed to void bill");
      console.error(error);
    }
  }, [activeBill, reloadBills, voidBill]);

  const handleOpenPaymentModal = useCallback(() => {
    if (currentRoundItems.length > 0) {
      toast.error("Please add current round before payment");
      return;
    }
    if (!activeBill || !activeBill.rounds?.length) {
      toast.error("Cannot process payment for empty bill");
      return;
    }
    setShowPaymentModal(true);
  }, [activeBill, currentRoundItems.length]);

  const handleProcessPayment = async (bill) => {
    setPaymentLoading(true);
    try {
      const totals = calculateBillTotals(bill);

      if (!totals || totals.total <= 0) {
        throw new Error("Invalid bill total");
      }

      if (!bill?.id || !bill?.rounds?.length) {
        throw new Error("Invalid bill for payment");
      }

      await PaymentService.process({
        billId: bill.id,
        paymentMode: paymentMethod,
        amount: totals.total,
      });

      toast.success(
        user.permissions?.includes("approve_payments")
          ? "Payment processed successfully."
          : "Payment processed. Awaiting Confirmation.",
      );

      // Refresh data after payment
      reloadBills();

      setShowPaymentModal(false);
      setActiveBill(null);
      setCurrentRoundItems([]);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to process payment";
      toast.error(errorMsg);
      console.error(error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const billTotals = activeBill ? calculateBillTotals(activeBill) : null;

  if (productsLoading || categoriesLoading || billsLoading) {
    return <LoadingSpinner />;
  }

  if (billsError) toast.error(billsError.message);

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
                {confirmPaidBills.length > 0 && (
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
                    {confirmPaidBills.length}
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
                  disabled={isCreatingBill}
                  className="px-4 py-2 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCreatingBill ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      <span>New Bill</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowOpenBillsModal(true)}
                  className="px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/20"
                >
                  <Receipt size={18} />
                  <span>Open Bills ({openBills.length})</span>
                </button>
                <button
                  onClick={() => setShowMyBillsModal(true)}
                  className="px-4 py-2 bg-linear-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-purple-500/20"
                >
                  <User size={18} />
                  <span>My Bills ({myOpenBills.length})</span>
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Refresh bills & products"
                >
                  <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
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
              disabled={isCreatingBill}
              className="flex-1 px-3 py-2.5 bg-linear-to-r from-green-600 to-emerald-600 active:from-green-700 active:to-emerald-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreatingBill ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  <span>New Bill</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowOpenBillsModal(true)}
              className="flex-1 px-3 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 active:from-blue-700 active:to-indigo-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/20 relative"
            >
              <Receipt size={20} />
              <span>Open ({openBills.length})</span>
            </button>
            <button
              onClick={() => setShowMyBillsModal(true)}
              className="px-3 py-2.5 bg-linear-to-r from-purple-600 to-violet-600 active:from-purple-700 active:to-violet-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-purple-500/20"
            >
              <User size={20} />
              <span>{myOpenBills.length}</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2.5 bg-gray-700 active:bg-gray-600 rounded-lg transition-all flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden md:pb-0 pb-16">
        {/* POS View */}
        {activeTab === "pos" && (
          <div className="h-screen flex overflow-hidden">
            {/* LEFT COLUMN - Category Side Panel for Large Screens */}
            <aside className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-purple-500/20 bg-gray-900/20 h-full overflow-hidden">
              <div className="shrink-0 p-4 border-b border-purple-500/20">
                <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  Categories
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                <div className="grid grid-cols-2 gap-2">
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

            {/* Category Tabs for Mobile/Tablet */}
            <div className="lg:hidden border-b border-purple-500/20 bg-gray-900/20">
              <div className="overflow-x-auto px-3 py-3">
                <div className="flex gap-2 min-w-max">
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

            {/* CENTER COLUMN - Products Section */}
            <div className="flex-1 flex flex-col overflow-hidden lg:border-r lg:border-purple-500/20">
              <div className="shrink-0 p-4 border-b border-purple-500/20 bg-gray-900/20">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Quick search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus={activeTab === "pos"}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setSearchTerm("");
                      if (e.key === "Enter" && filteredProducts.length > 0) {
                        handleAddProduct(filteredProducts[0]);
                      }
                    }}
                    className="w-full pl-11 pr-11 py-3 rounded-xl bg-gray-900/60 backdrop-blur-md border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-base"
                    aria-label="Search products"
                  />
                  <Search
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400"
                    size={20}
                    aria-hidden="true"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
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

            {/* RIGHT COLUMN - Current Bill Section (Desktop) */}
            <div className="hidden lg:block w-96 xl:w-[420px] bg-gray-900/20 max-h-screen overflow-hidden">
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
                  isAddingRound={addingRound}
                  stockWarnings={stockWarnings}
                />
              </div>
            </div>

            {/* Mobile Current Bill Modal */}
            {activeBill && (
              <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-end">
                <div className="w-full max-h-[85vh] bg-gray-900 rounded-t-2xl border-t-2 border-purple-500/30 overflow-hidden flex flex-col">
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
                    isAddingRound={addingRound}
                    stockWarnings={stockWarnings}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirm Payments View */}
        {activeTab === "confirm" && (
          <div className="p-4 overflow-y-auto h-full">
            <ConfirmPaymentsView
              awaitingConfirmation={confirmPaidBills}
              canAccessConfirm={canAccessConfirm}
              onProcessPayment={handleProcessPayment}
            />
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t-2 border-purple-500/30 safe-area-inset-bottom z-50">
        <div className="grid grid-cols-2 h-16">
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
            aria-label="POS View"
          >
            <ShoppingCart
              size={24}
              className={activeTab === "pos" ? "text-purple-400" : ""}
              aria-hidden="true"
            />
            <span className="text-xs font-medium">POS</span>
          </button>

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
              aria-label="Confirm Payments"
            >
              <div className="relative">
                <ClipboardCheck
                  size={24}
                  className={activeTab === "confirm" ? "text-purple-400" : ""}
                  aria-hidden="true"
                />
                {confirmPaidBills.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {confirmPaidBills.length}
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

      {showMyBillsModal && (
        <OpenBillsModal
          bills={myOpenBills}
          onSelectBill={handleSelectOpenBill}
          onClose={() => setShowMyBillsModal(false)}
          title="My Open Bills"
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

      {/* New Bill Modal */}
      {showNewBillModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">
              Create New Bill
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Enter customer name or table number
            </p>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Customer name or table number"
                value={newBillCustomerName}
                onChange={(e) => setNewBillCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newBillCustomerName.trim()) {
                    handleCreateNewBill();
                  }
                  if (e.key === "Escape") {
                    setShowNewBillModal(false);
                  }
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
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create Bill
                    </>
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

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBills } from "@/hooks/useBills";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { PaymentService } from "@/services/payment.service";
import {
  Search,
  X,
  Plus,
  User,
  Receipt,
  RefreshCw,
  Users,
  Clock,
  Zap,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  calculateBillTotals,
  calculateBillPaymentInfo,
} from "@/utils/calculations";
import toast from "react-hot-toast";
import ReceiptModal from "@/components/shared/ReceiptModal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import BetaProductGrid from "@/beta/components/BetaProductGrid";
import BetaCurrentBill from "@/beta/components/BetaCurrentBill";
import BetaOpenBillsModal from "@/beta/components/BetaOpenBillsModal";
import BetaPaymentModal from "@/beta/components/BetaPaymentModal";
import BetaQuickActions from "@/beta/components/BetaQuickActions";

const BetaPOSScreen = () => {
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
    [bills]
  );
  const myOpenBills = useMemo(
    () => openBills.filter((b) => b.created_by_user?.id === user?.id),
    [openBills, user?.id]
  );
  const confirmPaidBills = useMemo(
    () => bills.filter((b) => b.status === "awaiting_confirmation"),
    [bills]
  );

  // View state - 'browse' | 'bill' | 'payment'
  const [view, setView] = useState("browse");

  // POS state
  const [activeBill, setActiveBill] = useState(null);
  const [currentRoundItems, setCurrentRoundItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Operation states
  const [addingRound, setAddingRound] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showOpenBillsModal, setShowOpenBillsModal] = useState(false);
  const [showMyBillsModal, setShowMyBillsModal] = useState(false);
  const [showNewBillModal, setShowNewBillModal] = useState(false);
  const [newBillCustomerName, setNewBillCustomerName] = useState("");
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

  // Permission checks
  const canAccessConfirm = user?.permissions?.includes("approve_payments");

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  // Get quantity of product in current round
  const getCurrentRoundQuantity = useCallback(
    (productId) => {
      return currentRoundItems.find((i) => i.id === productId)?.quantity || 0;
    },
    [currentRoundItems]
  );

  // Stock warnings
  const stockWarnings = useMemo(() => {
    if (!activeBill) return {};
    return currentRoundItems.reduce((warnings, item) => {
      const product = products.find((p) => p.id === item.id);
      if (!product || typeof product.current_stock !== "number")
        return warnings;

      const quantityInRound = getCurrentRoundQuantity(item.id);
      if (quantityInRound > product.current_stock) {
        warnings[item.id] = {
          message: `Exceeds stock (${product.current_stock})`,
          severity: "error",
        };
      } else if (
        product.reorder_level > 0 &&
        product.current_stock <= product.reorder_level
      ) {
        warnings[item.id] = {
          message: `Low stock (${product.current_stock})`,
          severity: "warning",
        };
      }
      return warnings;
    }, {});
  }, [currentRoundItems, activeBill, products, getCurrentRoundQuantity]);

  // Filter products - only active with stock
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(
      (p) => p.active !== false && (!p.track_inventory || p.current_stock > 0)
    );

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(term));
    }

    return filtered;
  }, [products, selectedCategory, debouncedSearchTerm]);

  // Filter categories - only those with available active products
  const activeCategories = useMemo(() => {
    const categoryIdsWithProducts = new Set(
      products
        .filter((p) => p.active !== false && (!p.track_inventory || p.current_stock > 0))
        .map((p) => p.category_id)
    );
    return categories.filter((cat) => categoryIdsWithProducts.has(cat.id));
  }, [categories, products]);

  // Bill functions
  const handleStartNewBill = () => {
    setNewBillCustomerName("");
    setShowNewBillModal(true);
  };

  const handleCreateNewBill = useCallback(async () => {
    if (!newBillCustomerName.trim()) {
      toast.error("Please enter customer name or table");
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
      setView("bill");
      toast.success(`Bill started for ${newBill.customer_name}`);
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
    setShowMyBillsModal(false);
    setView("bill");
  };

  const handleAddProduct = useCallback(
    (product) => {
      if (!activeBill) {
        toast.error("Start a bill first");
        return;
      }

      // Stock validation
      if (
        typeof product.current_stock === "number" &&
        product.current_stock >= 0
      ) {
        const inCurrentRound = getCurrentRoundQuantity(product.id);
        if (inCurrentRound + 1 > product.current_stock) {
          toast.error(
            `Only ${product.current_stock} units of "${product.name}" available`,
            { duration: 3000 }
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
    },
    [activeBill, currentRoundItems, getCurrentRoundQuantity]
  );

  const handleUpdateQuantity = useCallback(
    (itemId, delta) => {
      if (delta > 0) {
        const product = products.find((p) => p.id === itemId);
        if (
          product &&
          typeof product.current_stock === "number" &&
          product.current_stock >= 0
        ) {
          const inCurrentRound = getCurrentRoundQuantity(itemId);
          if (inCurrentRound + delta > product.current_stock) {
            toast.error(`Insufficient stock for "${product.name}"`, {
              duration: 3000,
            });
            return;
          }
        }
      }

      setCurrentRoundItems((items) =>
        items
          .map((item) =>
            item.id === itemId
              ? { ...item, quantity: Math.max(0, item.quantity + delta) }
              : item
          )
          .filter((item) => item.quantity > 0)
      );
    },
    [products, getCurrentRoundQuantity]
  );

  const handleRemoveItem = useCallback((itemId) => {
    setCurrentRoundItems((items) => items.filter((item) => item.id !== itemId));
  }, []);

  const handleAddRound = useCallback(async () => {
    if (currentRoundItems.length === 0) {
      toast.error("Add items first");
      return;
    }
    if (!activeBill) {
      toast.error("No active bill");
      return;
    }

    // Final stock validation
    const invalidItem = currentRoundItems.find((item) => {
      const product = products.find((p) => p.id === item.id);
      if (!product || typeof product.current_stock !== "number") return false;
      return item.quantity > product.current_stock;
    });

    if (invalidItem) {
      toast.error("Stock error - please adjust quantities");
      return;
    }

    setAddingRound(true);

    try {
      const updatedBill = await addRoundService(activeBill.id, {
        items: currentRoundItems,
      });

      setActiveBill(null); // Close the bill panel completely
      setBills((prev) =>
        prev.map((b) => (b.id === updatedBill.id ? updatedBill : b))
      );
      setCurrentRoundItems([]);
      toast.success("Added to bill!");
      await reloadBills();
      
      // Revert to initial screen (browse view)
      setView("browse");
    } catch (error) {
      toast.error("Failed to add items");
      console.error(error);
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
  ]);

  const handleCloseBill = () => {
    if (currentRoundItems.length > 0) {
      if (!window.confirm("Discard unsaved items?")) return;
    }
    setActiveBill(null);
    setCurrentRoundItems([]);
    setView("browse");
  };

  const handleVoidBill = useCallback(async () => {
    if (!activeBill) return;
    setShowVoidConfirm(true);
  }, [activeBill]);

  const confirmVoidBill = useCallback(async () => {
    setShowVoidConfirm(false);
    if (!activeBill) return;

    try {
      await voidBill(activeBill.id);
      toast.success("Bill voided");
      await reloadBills();
      setActiveBill(null);
      setCurrentRoundItems([]);
      setView("browse");
    } catch (error) {
      toast.error("Failed to void bill");
    }
  }, [activeBill, reloadBills, voidBill]);

  const handleOpenPayment = useCallback(() => {
    if (currentRoundItems.length > 0) {
      toast.error("Add current items to bill first");
      return;
    }
    if (!activeBill || !activeBill.rounds?.length) {
      toast.error("Empty bill");
      return;
    }
    setShowPaymentModal(true);
  }, [activeBill, currentRoundItems.length]);

  const handleProcessPayment = async (bill, paymentLines) => {
    setPaymentLoading(true);
    try {
      const { data } = await PaymentService.process({
        billId: bill.id,
        payments: paymentLines,
      });

      if (data?.balance_due > 0) {
        toast.success(
          `Partial: KSh ${data.balance_due.toLocaleString()} remaining`
        );
      } else {
        toast.success(
          canAccessConfirm
            ? "Payment complete!"
            : "Payment recorded - awaiting confirmation"
        );
      }

      reloadBills();
      setShowPaymentModal(false);
      setActiveBill(null);
      setCurrentRoundItems([]);
      setView("browse");
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Payment failed";
      toast.error(errorMsg);
    } finally {
      setPaymentLoading(false);
    }
  };

  const billTotals = activeBill ? calculateBillTotals(activeBill) : null;
  const hasCriticalStockError = Object.values(stockWarnings).some(
    (w) => w?.severity === "error"
  );

  if (productsLoading || categoriesLoading || billsLoading) {
    return <LoadingSpinner />;
  }

  if (billsError) toast.error(billsError.message);

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col lg:flex-row overflow-hidden">
      {/* LEFT SIDE - Product Browser */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          view === "bill" ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Search Bar */}
        <div className="p-3 lg:p-4 border-b border-slate-700/30 bg-slate-900/30">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search drinks, bottles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-10 py-2.5 lg:py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/10 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-3 py-2 border-b border-slate-700/30 bg-slate-900/20">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                  : "bg-slate-800/50 text-gray-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              All
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                    : "bg-slate-800/50 text-gray-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4">
          <BetaProductGrid
            products={filteredProducts}
            onProductClick={handleAddProduct}
            disabled={!activeBill}
          />
        </div>

        {/* Quick Actions Footer - Mobile */}
        <div className="lg:hidden border-t border-slate-700/30 bg-slate-900/80 backdrop-blur-md p-3">
          <BetaQuickActions
            openBillsCount={openBills.length}
            myBillsCount={myOpenBills.length}
            pendingConfirmCount={confirmPaidBills.length}
            onNewBill={handleStartNewBill}
            onOpenBills={() => setShowOpenBillsModal(true)}
            onMyBills={() => setShowMyBillsModal(true)}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            canAccessConfirm={canAccessConfirm}
          />
        </div>
      </div>

      {/* RIGHT SIDE - Active Bill Panel */}
      <div
        className={`lg:w-[420px] xl:w-[480px] bg-slate-900/50 border-l border-slate-700/30 flex flex-col transition-all duration-300 ${
          view === "bill" ? "flex" : "hidden lg:flex"
        }`}
      >
        {/* Mobile Back Button */}
        <div className="lg:hidden p-3 border-b border-slate-700/30 flex items-center gap-2">
          <button
            onClick={() => setView("browse")}
            className="flex items-center gap-1 text-gray-400 hover:text-white"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back to Menu</span>
          </button>
        </div>

        {activeBill ? (
          <BetaCurrentBill
            bill={activeBill}
            currentRoundItems={currentRoundItems}
            onClose={handleCloseBill}
            onRemoveItem={handleRemoveItem}
            onUpdateQuantity={handleUpdateQuantity}
            onAddRound={handleAddRound}
            onOpenPayment={handleOpenPayment}
            onVoidBill={handleVoidBill}
            onShowReceipt={() => setShowReceiptModal(true)}
            isAddingRound={addingRound}
            stockWarnings={stockWarnings}
            hasCriticalStockError={hasCriticalStockError}
            onNewBill={handleStartNewBill}
            onOpenBills={() => setShowOpenBillsModal(true)}
            onMyBills={() => setShowMyBillsModal(true)}
            openBillsCount={openBills.length}
            myBillsCount={myOpenBills.length}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center mb-4">
              <Receipt size={32} className="text-pink-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Active Bill</h3>
            <p className="text-gray-400 mb-6 text-sm">
              Start a new bill or select an open one
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={handleStartNewBill}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                New Bill
              </button>
              <button
                onClick={() => setShowOpenBillsModal(true)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <Users size={18} />
                Open Bills ({openBills.length})
              </button>
              <button
                onClick={() => setShowMyBillsModal(true)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <User size={18} />
                My Bills ({myOpenBills.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showOpenBillsModal && (
        <BetaOpenBillsModal
          bills={openBills}
          onSelectBill={handleSelectOpenBill}
          onClose={() => setShowOpenBillsModal(false)}
          title="Open Bills"
        />
      )}

      {showMyBillsModal && (
        <BetaOpenBillsModal
          bills={myOpenBills}
          onSelectBill={handleSelectOpenBill}
          onClose={() => setShowMyBillsModal(false)}
          title="My Bills"
        />
      )}

      {showNewBillModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700/50 p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">New Bill</h2>
            <p className="text-sm text-gray-400 mb-4">
              Customer name or table number
            </p>

            <input
              type="text"
              placeholder="e.g., Table 5, John, etc."
              value={newBillCustomerName}
              onChange={(e) => setNewBillCustomerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newBillCustomerName.trim()) {
                  handleCreateNewBill();
                }
              }}
              autoFocus
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowNewBillModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewBill}
                disabled={!newBillCustomerName.trim() || isCreatingBill}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                {isCreatingBill ? "Creating..." : "Start"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && activeBill && (
        <BetaPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSubmitPayments={(lines) => handleProcessPayment(activeBill, lines)}
          billTotal={calculateBillPaymentInfo(activeBill).total}
          balanceDue={calculateBillPaymentInfo(activeBill).balanceDue}
          amountPaid={calculateBillPaymentInfo(activeBill).amountPaid}
          canAccessConfirm={canAccessConfirm}
          loading={paymentLoading}
        />
      )}

      {showReceiptModal && activeBill && (
        <ReceiptModal bill={activeBill} onClose={() => setShowReceiptModal(false)} />
      )}

      {showVoidConfirm && activeBill && (
        <ConfirmModal
          title="Void Bill"
          message={`Void bill for ${activeBill.customer_name}? This cannot be undone.`}
          confirmLabel="Void Bill"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={confirmVoidBill}
          onCancel={() => setShowVoidConfirm(false)}
        />
      )}
    </div>
  );
};

export default BetaPOSScreen;

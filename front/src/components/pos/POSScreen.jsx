import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useBills } from "../../hooks/useBills";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import SkeletonLoader from "../shared/SkeletonLoader";
import toast from "react-hot-toast";
import { FileText, ShoppingCart, X } from "lucide-react";
import ProductGrid from "./ProductGrid";
import CurrentBill from "./CurrentBill";
import OpenBillsModal from "./OpenBillsModal";

const POSScreen = ({ onBillUpdate }) => {
  const { user } = useAuth();

  /* Bills domain */
  const {
    bills: openBills,
    isLoading: billsLoading,
    error: billsError,
    openBill,
    addRound: addBillRound,
  } = useBills();

  /** Products & categories */
  const { products, isLoading: productsLoading } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();

  /** UI-only state */
  const [customerName, setCustomerName] = useState("");
  const [activeBillId, setActiveBillId] = useState(null);
  const [currentRoundItems, setCurrentRoundItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showOpenBillsModal, setShowOpenBillsModal] = useState(false);
  const [showMobileBill, setShowMobileBill] = useState(false);

  // Save selected category to "Beers" on mount
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      const beersCategory = categories.find(
        (c) => c.name.toLowerCase() === "beers"
      );

      if (beersCategory) {
        setSelectedCategory(beersCategory.id);
      } else {
        setSelectedCategory(categories[0].id);
      }
    }
  }, [categories, selectedCategory]);

  // Notify parent of bill updates
  useEffect(() => {
    if (onBillUpdate) {
      onBillUpdate();
    }
  }, [openBills.length, onBillUpdate]);

  const currentBill =
    openBills.find((bill) => bill.id === activeBillId) || null;

  /** ---------- Guards ---------- */
  // Or use skeleton loaders for better UX
  if (billsLoading || productsLoading || categoriesLoading) {
    return (
      <div className="grid lg:grid-cols-3 grid-cols-1 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonLoader type="card" count={1} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <SkeletonLoader type="product" count={3} />
          </div>
        </div>
        <div className="hidden lg:block">
          <SkeletonLoader type="card" count={1} />
        </div>
      </div>
    );
  }

  if (billsError) {
    return <div className="text-red-500 text-center p4">{billsError}</div>;
  }

  /** ---------- Handlers ---------- */
  const startNewBill = async () => {
    if (!customerName.trim()) {
      toast.error("Please enter customer name or table number.");
      return;
    }

    try {
      const bill = await openBill({
        customerName: customerName.trim(),
        createdBy: user.id,
      });

      setActiveBillId(bill.id);
      setCustomerName("");
      setCurrentRoundItems([]);
      toast.success(`Bill created for ${bill.customer_name}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create bill");
    }
  };

  const selectOpenBill = (bill) => {
    setActiveBillId(bill.id);
    setCurrentRoundItems([]);
    setShowOpenBillsModal(false);
    toast.success(`Selected bill for ${bill.customer_name}`);
  };

  const addItemToCurrentRound = (product) => {
    if (!currentBill) {
      toast.error("Please start or select a bill");
      return;
    }

    setCurrentRoundItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);

      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });

    // Auto-show bill on mobile when item is added
    if (window.innerWidth < 1024) {
      toast.success(`Added ${product.name}`);
    }
  };

  const updateItemQuantity = (itemId, delta) => {
    setCurrentRoundItems((prev) =>
      prev
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (itemId) => {
    setCurrentRoundItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const addRoundToBill = async () => {
    if (!currentBill || currentRoundItems.length === 0) {
      toast.error("No items to add");
      return;
    }

    try {
      await addBillRound(currentBill.id, {
        items: currentRoundItems,
        roundNumber: currentBill.rounds.length + 1,
      });

      setCurrentRoundItems([]);
      toast.success("Round added to bill");
    } catch {
      toast.error("Failed to add round");
    }
  };

  const closeBill = () => {
    if (currentRoundItems.length > 0) {
      toast.error("Please add current round before closing");
      return;
    }

    setActiveBillId(null);
    setCurrentRoundItems([]);
  };

  /** ---------- Render ---------- */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* LEFT: Products */}
      <div className="lg:col-span-2 space-y-4">
        {/* Customer name and bill controls */}
        <div className="bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer/table  name..."
              disabled={!!currentBill}
              className="flex-1 px-3 sm:px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-500 disabled:opacity-50"
            />
            <div className="flex gap-2">
              <button
                onClick={startNewBill}
                disabled={!!currentBill}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg font-semibold
                  bg-linear-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 
                  whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                New Bill
              </button>

              {openBills.length > 0 && (
                <button
                  onClick={() => setShowOpenBillsModal(true)}
                  className="bg-linear-to-r from-green-500 to-teal-500 rounded-lg px-4 sm:px-6 py-2 font-semibold flex-1 sm:flex-none flex sm:text-base justify-center
                   items-center hover:from-green-600 hover:to-teal-600 transition-all text-sm"
                >
                  <FileText size={18} className="mr-1" />
                  <span className="hidden sm:inline">
                    Open ({openBills.length})
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cate) => (
            <button
              key={cate.id}
              onClick={() => setSelectedCategory(cate.id)}
              className={`sm:px-4 px-3 py-2 rounded-lg font-semibold whitespace-nowrap text-sm sm:text-base transition-all ${
                selectedCategory === cate.id
                  ? "text-white shadow-lg transform scale-105"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              style={{
                backgroundColor:
                  selectedCategory === cate.id ? cate.color : undefined,
              }}
            >
              {cate.name}
            </button>
          ))}
        </div>

        {/* Products */}
        <ProductGrid
          products={products.filter((p) => p.category_id === selectedCategory)}
          onProductClick={addItemToCurrentRound}
          disabled={!currentBill}
        />
      </div>

      {/* RIGHT: Bill - Desktop Only */}
      <div className="hidden lg:block">
        <CurrentBill
          bill={currentBill}
          currentRoundItems={currentRoundItems}
          onUpdateQuantity={updateItemQuantity}
          onRemoveItem={removeItem}
          onAddRound={addRoundToBill}
          onCloseBill={closeBill}
        />
      </div>

      {/* Mobile: Floating Cart Button */}
      {currentBill && (
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setShowMobileBill(true)}
            className="bg-linear-to-r from-pink-500 to-purple-500 text-white rounded-full p-4 shadow-2xl hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-110 active:scale-95"
          >
            <div className="relative">
              <ShoppingCart size={28} />
              {currentRoundItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                  {currentRoundItems.length}
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Mobile: Bill Modal */}
      {showMobileBill && (
        <div className="lg:hidden fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingCart size={20} className="text-pink-500" />
                Current Bill
              </h3>
              <button
                onClick={() => setShowMobileBill(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <CurrentBill
                bill={currentBill}
                currentRoundItems={currentRoundItems}
                onUpdateQuantity={updateItemQuantity}
                onRemoveItem={removeItem}
                onAddRound={addRoundToBill}
                onCloseBill={closeBill}
                isMobile={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Open Bills */}
      {showOpenBillsModal && (
        <OpenBillsModal
          bills={openBills}
          onSelectBill={selectOpenBill}
          onClose={() => setShowOpenBillsModal(false)}
        />
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default POSScreen;

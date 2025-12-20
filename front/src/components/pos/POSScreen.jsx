import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useBills } from "../../hooks/useBills";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import SkeletonLoader from "../shared/SkeletonLoader";
import toast from "react-hot-toast";
import { FileText } from "lucide-react";
import ProductGrid from "./ProductGrid";
import CurrentBill from "./CurrentBill";
import OpenBillsModal from "./OpenBillsModal";

const POSScreen = () => {
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

  const currentBill =
    openBills.find((bill) => bill.id === activeBillId) || null;

  /** ---------- Guards ---------- */
  // Or use skeleton loaders for better UX
  if (billsLoading || productsLoading || categoriesLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <SkeletonLoader type="card" count={1} />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonLoader type="product" count={3} />
          </div>
        </div>
        <SkeletonLoader type="card" count={1} />
      </div>
    );
  }

  if (billsError) {
    return (
      <div className="text-red-500 text-center">
        Failed to load bills: {billsError}
      </div>
    );
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
        waitressId: user.id,
        waitressName: user.name,
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
        addedBy: user.name,
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
    <div className="grid grid-cols-3 gap-4">
      {/* LEFT: Products */}
      <div className="col-span-2 space-y-4">
        {/* Customer name and bill controls */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex space-x-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer/table  name..."
              disabled={!!currentBill}
              className="flex-1 px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500 disabled:opacity-50"
            />
            <button
              onClick={startNewBill}
              disabled={!!currentBill}
              className="px-6 py-2 bg-linear-to-r from-pink-500 to-purple-500 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              New Bill
            </button>

            {openBills.length > 0 && (
              <button
                onClick={() => setShowOpenBillsModal(true)}
                className="bg-linear-to-r from-green-500 to-teal-500 rounded-lg px-6 py-2 font-semibold flex items-center"
              >
                <FileText size={18} className="mr-1" />
                Open ({openBills.length})
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex space-x-2 overflow-x-auto">
          {categories.map((cate) => (
            <button
              key={cate.id}
              onClick={() => setSelectedCategory(cate.id)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                selectedCategory === cate.id
                  ? "text-white shadow-lg"
                  : "bg-gray-800 text-gray-400"
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
      {/* RIGHT: Bill */}
      <div>
        <CurrentBill
          bill={currentBill}
          currentRoundItems={currentRoundItems}
          onUpdateQuantity={updateItemQuantity}
          onRemoveItem={removeItem}
          onAddRound={addRoundToBill}
          onCloseBill={closeBill}
        />
      </div>
      {/* Open Bills */}
      {showOpenBillsModal && (
        <OpenBillsModal
          bills={openBills}
          onSelectBill={selectOpenBill}
          onClose={() => setShowOpenBillsModal(false)}
        />
      )}
    </div>
  );
};

export default POSScreen;

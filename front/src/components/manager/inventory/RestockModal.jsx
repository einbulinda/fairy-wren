import { useState, useEffect } from "react";
import { inventoryService } from "../../../services/inventory.service";
import toast from "react-hot-toast";

const RestockModal = ({ product, onClose, onSuccess }) => {
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState(
    product.cost_price?.toString() || ""
  );
  const [loading, setLoading] = useState(false);

  // Calculate totals
  const newStock = (product.current_stock || 0) + (Number(quantity) || 0);
  const totalCost = (Number(quantity) || 0) * (Number(unitCost) || 0);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();

    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!unitCost || unitCost <= 0) {
      toast.error("Please enter a valid unit cost");
      return;
    }

    try {
      setLoading(true);
      await inventoryService.restock({
        productId: product.id,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
      });
      toast.success("Stock updated successfully!");
      onSuccess();
    } catch (err) {
      toast.error(err.message || "Restock failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="
          bg-gray-900/95 backdrop-blur-md
          border border-purple-500/20
          rounded-2xl
          w-full max-w-md
          shadow-2xl shadow-purple-500/10
          animate-in fade-in zoom-in duration-200
        "
      >
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-purple-500/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <svg
                    className="w-6 h-6 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Restock Item
                  </h2>
                </div>
              </div>
              <p className="text-gray-400 text-sm">Add inventory for:</p>
              <p className="text-white font-semibold mt-1">{product.name}</p>
            </div>

            <button
              onClick={onClose}
              className="
                p-2 rounded-lg
                text-gray-400 hover:text-white
                hover:bg-purple-500/10
                transition-all duration-200
                border border-transparent hover:border-purple-500/20
              "
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Current Stock Info */}
          <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Current Stock:</span>
              <span className="font-mono font-semibold text-purple-300">
                {product.current_stock} {product.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-5">
          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quantity to Add
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                className="
                  w-full px-4 py-3 rounded-lg
                  bg-gray-800/50 backdrop-blur-sm
                  border border-purple-500/20
                  text-white placeholder-gray-500
                  focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                  transition-all duration-200
                "
                placeholder="Enter quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                {product.unit}
              </div>
            </div>
          </div>

          {/* Unit Cost Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Unit Cost (KSh)
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                KSh
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                className="
                  w-full pl-12 pr-4 py-3 rounded-lg
                  bg-gray-800/50 backdrop-blur-sm
                  border border-purple-500/20
                  text-white placeholder-gray-500
                  focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                  transition-all duration-200
                  font-mono
                "
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>

          {/* Calculation Summary */}
          {quantity && unitCost && (
            <div className="space-y-3 p-4 rounded-lg bg-linear-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">New Total Stock:</span>
                <span className="font-mono font-semibold text-purple-300">
                  {newStock} {product.unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Quantity Added:</span>
                <span className="font-mono font-semibold text-white">
                  +{quantity} {product.unit}
                </span>
              </div>
              <div className="h-px bg-purple-500/20" />
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-medium">Total Cost:</span>
                <span className="font-mono font-bold text-lg text-pink-400">
                  KSh{" "}
                  {totalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                flex-1 px-4 py-3 rounded-lg
                bg-gray-800/50 backdrop-blur-sm
                border border-gray-700
                text-gray-300 hover:text-white
                hover:bg-gray-800
                transition-all duration-200
                font-medium
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !quantity || !unitCost}
              className="
                flex-1 px-4 py-3 rounded-lg
                bg-linear-to-r from-purple-600 to-pink-600
                hover:from-purple-700 hover:to-pink-700
                text-white font-semibold
                shadow-lg shadow-purple-500/30
                hover:shadow-purple-500/50
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:shadow-purple-500/30
                flex items-center justify-center gap-2
                border border-purple-500/30
              "
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Confirm Restock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestockModal;

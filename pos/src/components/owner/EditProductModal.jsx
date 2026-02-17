import { X } from "lucide-react";

const EditProductModal = ({
  isOpen,
  onClose,
  productData,
  setProductData,
  categories,
  handleSaveProduct,
  editingProduct,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-gray-800/95 backdrop-blur-xl w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl border-2 border-pink-500/50 shadow-2xl shadow-pink-500/20 max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-700/50 backdrop-blur-sm shrink-0">
          <h3 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-purple-500">
            {editingProduct ? "Edit Product" : "Add New Product"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={24} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Product Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm text-gray-300 mb-2 font-medium">
                Product Name <span className="text-pink-500">*</span>
              </label>
              <input
                value={productData.name}
                onChange={(e) =>
                  setProductData({ ...productData, name: e.target.value })
                }
                type="text"
                placeholder="e.g., Tusker Beer"
                autoFocus
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/50 backdrop-blur-sm border-2 border-purple-500/50 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs sm:text-sm text-gray-300 mb-2 font-medium">
                Category <span className="text-pink-500">*</span>
              </label>
              <select
                value={productData.categoryId}
                onChange={(e) =>
                  setProductData({ ...productData, categoryId: e.target.value })
                }
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/50 backdrop-blur-sm border-2 border-purple-500/50 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs sm:text-sm text-gray-300 mb-2 font-medium">
                Price (KSh.) <span className="text-pink-500">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={productData.price}
                onChange={(e) =>
                  setProductData({ ...productData, price: e.target.value })
                }
                placeholder="0.00"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/50 backdrop-blur-sm border-2 border-purple-500/50 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
              />
            </div>

            {/* Stock */}
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm text-gray-300 mb-2 font-medium">
                Initial Stock <span className="text-pink-500">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={productData.stock}
                onChange={(e) =>
                  setProductData({ ...productData, stock: e.target.value })
                }
                placeholder="0"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/50 backdrop-blur-sm border-2 border-purple-500/50 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
              />
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-4 sm:mt-5 bg-linear-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-purple-300">
              <span className="font-semibold">💡 Tip:</span> Make sure all
              required fields are filled out. Stock can be adjusted later from
              inventory management.
            </p>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="p-4 sm:p-6 border-t border-gray-700/50 backdrop-blur-sm shrink-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleSaveProduct}
              disabled={
                !productData.name.trim() ||
                !productData.price ||
                !productData.categoryId ||
                productData.stock === ""
              }
              className="flex-1 py-3 sm:py-3.5 bg-linear-to-r from-green-600 to-emerald-600 rounded-lg font-semibold text-white text-sm sm:text-base hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-green-500/20 hover:shadow-green-500/40"
            >
              {editingProduct ? "Update Product" : "Create Product"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 sm:py-3.5 bg-gray-600/80 backdrop-blur-sm rounded-lg font-semibold text-white text-sm sm:text-base hover:bg-gray-700 transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EditProductModal;

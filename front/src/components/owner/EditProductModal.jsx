import { Upload, ImageIcon } from "lucide-react";

const EditProductModal = ({
  isOpen,
  onClose,
  productData,
  setProductData,
  categories,
  imagePreview,
  handleImageSelect,
  handleSaveProduct,
  uploadingImage,
  editingProduct,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl border-2 border-pink-500 my-8">
        <h3 className="text-2xl font-bold text-pink-500 mb-4">
          {editingProduct ? "Edit Product" : "Add New Product"}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column - Image Upload */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Product Image
            </label>
            <div className="space-y-3">
              {/* Image Preview */}
              <div className="w-full h-48 bg-gray-900 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-700 overflow-hidden">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No image selected</p>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onClick={handleImageSelect}
                  className="hidden"
                />
                <div className="w-full px-4 py-2 bg-purple-600 rounded-lg font-semibold hover:bg-purple-700 cursor-pointer flex items-center justify-center">
                  <Upload size={18} className="mr-2" />
                  {imagePreview ? "Change Image" : "Upload Image"}
                </div>
              </label>

              {/* Emoji Fallback */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Or use emoji:
                </label>
                <input
                  type="text"
                  value={productData.image}
                  onChange={(e) =>
                    setProductData({ ...productData, image: e.target.value })
                  }
                  placeholder="📦"
                  maxLength="2"
                  className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white text-center text-2xl focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          </div>
          {/* Right Column - Product Details */}
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Product Name *
              </label>
              <input
                value={productData.name}
                onChange={(e) =>
                  setProductData({ ...productData, name: e.target.value })
                }
                type="text"
                placeholder="e.g., Tusker Beer"
                className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Category *
              </label>
              <select
                value={productData.categoryId}
                onChange={(e) =>
                  setProductData({ ...productData, categoryId: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Price (KES) *
              </label>
              <input
                type="number"
                step="0.01"
                value={productData.price}
                onChange={(e) =>
                  setProductData({ ...productData, price: e.target.value })
                }
                placeholder="0.00"
                className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Initial Stock *
              </label>
              <input
                type="number"
                value={productData.stock}
                onChange={(e) =>
                  setProductData({ ...productData, stock: e.target.value })
                }
                placeholder="0"
                className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-2 mt-6">
          <button
            onClick={handleSaveProduct}
            disabled={uploadingImage}
            className="flex-1 py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingImage
              ? "Uploading Image..."
              : editingProduct
              ? "Update Product"
              : "Create Product"}
          </button>
          <button
            onClick={onClose}
            disabled={uploadingImage}
            className="flex-1 py-3 bg-gray-600 rounded-lg font-semibold hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProductModal;

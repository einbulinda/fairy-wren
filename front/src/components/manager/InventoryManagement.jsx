import { useState } from "react";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import LoadingSpinner from "../shared/LoadingSpinner";
import { ClipboardCheck } from "lucide-react";
import { getStockColor } from "../../utils/calculations";
import StockTakeModal from "./StockTakeModal";

const InventoryManagement = () => {
  const {
    products,
    isLoading: productsLoading,
    reload: productsReload,
  } = useProducts();
  const {
    categories,
    isLoading: categoriesLoading,
    reload: categoryReload,
  } = useCategories();

  const [showStockTakeModal, setShowStockTakeModal] = useState(false);

  const handleRestock = async (productId) => {};

  // Loading Screen
  if (productsLoading || categoriesLoading) return <LoadingSpinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-pink-500">
          Inventory Management
        </h2>
        <button
          onClick={() => setShowStockTakeModal(true)}
          className="px-4 py-2 bg-purple-600 rounded-lg font-semibold hover:bg-purple-700 flex items-center"
        >
          <ClipboardCheck size={18} className="mr-2" />
          Start Stock Take
        </button>
      </div>

      <div className="grid gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-gray-800 p-4 rounded-lg border border-gray-700"
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: cat.color }}>
              {cat.name}
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {products
                .filter((p) => p.category_id === cat.id)
                .map((product) => (
                  <div
                    key={product.id}
                    className="bg-gray-700 p-3 rounded text-center"
                  >
                    {product.image_url ? (
                      <div className="relative w-full h-32 bg-gray-900">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="text-5xl mb-2">{product.image}</div>
                    )}
                    <div className="font-semibold">{product.name}</div>

                    <div className="text-sm text-gray-400">
                      {product.price} KES
                    </div>
                    <div
                      className={`text-lg font-bold mt-1 ${getStockColor(
                        product.stock
                      )}`}
                    >
                      Stock: {product.stock}
                    </div>
                    <button
                      onClick={() => handleRestock(product.id)}
                      className="mt-2 w-full py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
                    >
                      Restock
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      {showStockTakeModal && (
        <StockTakeModal
          products={products}
          categories={categories}
          onClose={() => setShowStockTakeModal(false)}
          onComplete={() => {
            productsReload();
            categoryReload();
          }}
        />
      )}
    </div>
  );
};

export default InventoryManagement;

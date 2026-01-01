import React, { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useProducts } from "../../hooks/useProducts";
import toast from "react-hot-toast";

const StockTakeModal = ({ products, categories, onClose, onComplete }) => {
  const { user } = useAuth();
  const { updateStocks, createStockTake, isLoading } = useProducts();

  const [stockTakeData, setStockTakeData] = useState(() => {
    const initial = {};
    products.forEach((p) => {
      initial[p.id] = { expected: p.stock, actual: p.stock };
    });
    return initial;
  });

  const handleComplete = async () => {
    try {
      // 1. Update only changed stocks (parallel, not sequential)
      const stockUpdates = products
        .filter((product) => {
          const takeData = stockTakeData[product.id];
          return takeData && takeData.actual !== takeData.expected;
        })
        .map((product) => {
          const takeData = stockTakeData[product.id];
          return updateStocks(product.id, {
            quantity: takeData.actual,
          });
        });

      await Promise.all(stockUpdates);

      // 2. Record the stock take
      const response = await createStockTake({
        performedBy: user.id,
        performedByName: user.name,
        items: products.map((p) => ({
          productId: p.id,
          productName: p.name,
          expected: stockTakeData[p.id].expected,
          actual: stockTakeData[p.id].actual,
        })),
      });

      if (response) toast.success("Stock take completed!");
      onComplete();
      onClose();
    } catch (error) {
      console.error("Stock take failed", error);
      toast.error("Failed to complete stock take");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl border-2 border-pink-500 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-pink-500">Stock Take</h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="bg-gray-700 p-4 rounded-lg">
              <h4 className="font-bold mb-3" style={{ color: category.color }}>
                {category.name}
              </h4>
              <div className="space-y-2">
                {products
                  .filter((p) => p.category_id === category.id)
                  .map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between bg-gray-800 p-3 rounded"
                    >
                      <div className="flex items-center flex-1">
                        <div className="text-2xl mr-3">{product.image}</div>
                        <div>
                          <div className="font-semibold">{product.name}</div>
                          <div className="text-sm text-gray-400">
                            Expected:{" "}
                            {stockTakeData[product.id]?.expected ||
                              product.stock}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-400">Actual:</label>
                        <input
                          type="number"
                          value={
                            stockTakeData[product.id]?.actual || product.stock
                          }
                          onChange={(e) =>
                            setStockTakeData({
                              ...stockTakeData,
                              [product.id]: {
                                expected: product.stock,
                                actual: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-20 px-2 py-1 bg-gray-700 border border-purple-500 rounded text-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex space-x-2 mt-6">
                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : "Complete Stock Take"}
                </button>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-gray-600 rounded-lg font-semibold hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StockTakeModal;

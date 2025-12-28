import React, { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const StockTakeModal = ({ products, categories, onClose, onComplete }) => {
  const { user } = useAuth();

  const [stockTakeData, setStockTakeData] = useState(() => {
    const initial = {};
    products.forEach((p) => {
      initial[p.id] = { expected: p.stock, actual: p.stock };
    });
    return initial;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl border-2 border-pink-500 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-pink-500">Stock Take</h3>
          <button
            onClick={onClose}
            //disabled={loading}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4"></div>
      </div>
    </div>
  );
};

export default StockTakeModal;

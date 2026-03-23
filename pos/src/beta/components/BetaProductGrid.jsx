import React from "react";
import { Package, AlertTriangle, Plus } from "lucide-react";

const BetaProductGrid = ({ products, onProductClick, disabled }) => {
  const getStockStatus = (product) => {
    const stock = product.current_stock;
    const isLow =
      product.reorder_level > 0 &&
      stock > 0 &&
      stock <= product.reorder_level;

    if (stock === 0) {
      return {
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        label: "Out",
        available: false,
      };
    }
    if (isLow) {
      return {
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        label: `${stock} left`,
        available: true,
        warning: true,
      };
    }
    return {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      label: "In Stock",
      available: true,
    };
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
          <Package size={28} className="text-gray-500" />
        </div>
        <p className="text-gray-400 font-medium mb-1">No products found</p>
        <p className="text-sm text-gray-500">
          Try a different search or category
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {products.map((product) => {
        const stockStatus = getStockStatus(product);
        const isDisabled = disabled || !stockStatus.available;

        return (
          <button
            key={product.id}
            disabled={isDisabled}
            onClick={() => onProductClick(product)}
            className={`group relative bg-slate-800/40 backdrop-blur-sm border rounded-xl p-3 lg:p-4 transition-all duration-200 text-left ${
              isDisabled
                ? "border-slate-700/30 opacity-50 cursor-not-allowed"
                : "border-slate-700/50 hover:border-pink-500/50 hover:bg-slate-800/60 cursor-pointer active:scale-[0.98]"
            }`}
          >
            {/* Add indicator on hover */}
            {!isDisabled && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-pink-500/0 group-hover:bg-pink-500/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                <Plus size={14} className="text-pink-400" />
              </div>
            )}

            {/* Product Name */}
            <h3 className="font-semibold text-white text-sm lg:text-base leading-tight line-clamp-2 mb-1 pr-6">
              {product.name}
            </h3>

            {/* Unit */}
            <p className="text-xs text-gray-500 mb-2">{product.unit}</p>

            {/* Price */}
            <p className="text-lg lg:text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-3">
              KSh {product.price}
            </p>

            {/* Stock Status */}
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${stockStatus.bg} ${stockStatus.color} ${stockStatus.border} border`}
            >
              {stockStatus.warning && <AlertTriangle size={10} />}
              <span>{stockStatus.label}</span>
            </div>

            {/* Out of Stock Overlay */}
            {!stockStatus.available && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-red-400 font-semibold text-sm">
                  Out of Stock
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BetaProductGrid;

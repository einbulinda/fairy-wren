import React from "react";
import { Package, AlertTriangle } from "lucide-react";

const ProductGrid = ({ products, onProductClick, disabled }) => {
  const getStockStatus = (stock) => {
    if (stock === 0)
      return {
        color: "text-red-500",
        bg: "bg-red-500/10",
        label: "Out of stock",
        icon: true,
      };
    if (stock <= 5)
      return {
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        label: `Low: ${stock}`,
        icon: true,
      };
    if (stock <= 20)
      return {
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        label: `Stock: ${stock}`,
        icon: false,
      };
    return {
      color: "text-green-500",
      bg: "bg-green-500/10",
      label: `Stock: ${stock}`,
      icon: false,
    };
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
      {products.map((product) => {
        const stockStatus = getStockStatus(product.current_stock);
        const isOutOfStock = product.current_stock === 0;

        return (
          <button
            key={product.id}
            disabled={isOutOfStock || disabled}
            onClick={() => onProductClick(product)}
            className={`relative bg-gray-900/40 backdrop-blur-md border rounded-xl p-4 transition-all touch-manipulation min-h-[140px] ${
              isOutOfStock
                ? "border-red-500/20 opacity-60 cursor-not-allowed"
                : "border-purple-500/20 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 active:scale-[0.98] active:border-purple-500/70"
            } ${disabled && !isOutOfStock ? "opacity-70 cursor-not-allowed" : ""} ${!isOutOfStock && !disabled ? "cursor-pointer" : ""}`}
          >
            {/* Out of stock overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-10 pointer-events-none">
                <div className="text-center">
                  <Package className="mx-auto mb-2 text-red-400" size={28} />
                  <p className="text-sm font-semibold text-red-400">
                    Out of Stock
                  </p>
                </div>
              </div>
            )}

            <div className="text-left h-full flex flex-col">
              {/* Product name - shows full name on multiple lines */}
              <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 mb-1 min-h-[2.5rem]">
                {product.name}
              </h3>

              <p className="text-xs text-gray-400 mb-2">{product.unit}</p>

              {/* Price */}
              <p className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-auto">
                KSh {product.price}
              </p>

              {/* Stock indicator with color coding */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md ${stockStatus.bg} mt-3`}
              >
                {stockStatus.icon && (
                  <AlertTriangle size={14} className={stockStatus.color} />
                )}
                <p className={`text-xs font-semibold ${stockStatus.color}`}>
                  {stockStatus.label}
                </p>
              </div>
            </div>
          </button>
        );
      })}

      {products.length === 0 && (
        <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 text-center py-12 sm:py-16">
          <div className="relative w-full max-w-md mx-auto h-[140px] rounded-[20px] overflow-hidden border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-blue-600/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-cyan-900/20 rounded-full blur-2xl"></div>
            <div className="relative h-full w-full flex items-center justify-center z-10">
              <div className="text-center">
                <Package size={40} className="mx-auto mb-3 text-gray-500" />
                <p className="text-white/70 text-base sm:text-lg font-medium">
                  No products found
                </p>
                <p className="text-white/40 text-sm mt-1">
                  Try selecting a different category
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;

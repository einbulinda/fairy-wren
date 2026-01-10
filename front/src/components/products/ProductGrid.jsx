import React from "react";

const ProductGrid = ({ products, onProductClick, disabled }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onProductClick(product)}
          disabled={disabled}
          className="bg-gray-900/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="text-left">
            <h3 className="font-semibold text-white text-sm mb-1 truncate group-hover:text-purple-300 transition-colors">
              {product.name}
            </h3>
            <p className="text-xs text-gray-400 mb-2">{product.unit}</p>
            <p className="text-lg font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              KSh {product.price}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Stock: {product.current_stock}
            </p>
          </div>
        </button>
      ))}

      {products.length === 0 && (
        <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 text-center py-12 sm:py-16">
          <div className="relative w-full max-w-md mx-auto h-[140px] rounded-[20px] overflow-hidden border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-blue-600/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-cyan-900/20 rounded-full blur-2xl"></div>
            <div className="relative h-full w-full flex items-center justify-center z-10">
              <p className="text-white/70 text-base sm:text-lg font-medium">
                No products found
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;

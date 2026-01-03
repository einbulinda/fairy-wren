import React from "react";

const ProductGrid = ({ products, onProductClick, disabled }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onProductClick(product)}
          disabled={disabled}
          className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
            disabled
              ? "bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed"
              : "bg-gray-800 border-purple-500 hover:border-pink-500 hover:scale-105 active:scale-95"
          }`}
        >
          {/* Display image or emoji */}
          {product.image_url ? (
            <div className="relative w-full bg-gray-900 h-24 sm:h-28 md:h-32 rounded-md mb-2">
              <img
                src={product.image_url}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-contain p-1 sm:p-2"
              />
            </div>
          ) : (
            <div className="md:text-5xl text-3xl sm:text-4xl mb-2 h-24 sm:h-28 md:h-32 flex items-center justify-center">
              {product.image}
            </div>
          )}

          <div className="font-semibold text-sm sm:text-base mb-1 line-clamp-2 min-h-10">
            {product.name}
          </div>
          <div className="text-pink-500 font-bold text-sm sm:text-base">
            KSh. {product.price}
          </div>

          <div
            className={`text-xs sm:text-sm mt-1 font-medium ${
              product.stock < 20
                ? "text-red-500"
                : product.stock < 50
                ? "text-yellow-500"
                : "text-green-500"
            }`}
          >
            Stock: {product.stock}
          </div>
        </button>
      ))}

      {products.length === 0 && (
        <div className="col-span-2 md:col-span-4 sm:col-span-3 lg:col-span-4 xl:col-span-5 text-center text-gray-500 py-8 sm:py-12">
          No products in this category
        </div>
      )}
    </div>
  );
};

export default ProductGrid;

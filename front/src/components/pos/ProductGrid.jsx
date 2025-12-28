import React from "react";

const ProductGrid = ({ products, onProductClick, disabled }) => {
  return (
    <div className="grid grid-cols-4 gap-3">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onProductClick(product)}
          disabled={disabled}
          className={`p-4 rounded-lg border-2 transition-all ${
            disabled
              ? "bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed"
              : "bg-gray-800 border-purple-500 hover:border-pink-500 hover:scale-105"
          }`}
        >
          {/* Display image or emoji */}
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

          <div className="font-semibold text-base">{product.name}</div>
          <div className="text-pink-500 font-bold">KSh. {product.price}</div>

          <div
            className={`text-xs mt-1 ${
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
        <div className="col-span-4 text-center text-gray-500 py-12">
          No products in this category
        </div>
      )}
    </div>
  );
};

export default ProductGrid;

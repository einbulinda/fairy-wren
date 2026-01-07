import React from "react";

const ProductGrid = ({ products, onProductClick, disabled }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onProductClick(product)}
          disabled={disabled}
          className={`group transition-all duration-300 ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]"
          }`}
        >
          {/* The Landscape Card */}
          <div className="relative w-full h-[140px] sm:h-[150px] rounded-[20px] overflow-hidden border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
            {/* Background Glows */}
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-500/15 transition-colors duration-500"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-cyan-900/20 rounded-full blur-2xl group-hover:bg-cyan-800/25 transition-colors duration-500"></div>

            {/* Content Layer */}
            <div className="relative h-full w-full p-4 sm:p-5 flex flex-col justify-between z-10">
              {/* Top Section */}
              <div className="space-y-0.5">
                <h1 className="text-base sm:text-[19px] font-bold text-white leading-tight tracking-tight max-w-[90%] line-clamp-2 text-left">
                  {product.name}
                </h1>
                <p className="text-[#D4AF37] text-sm sm:text-base italic font-serif font-medium text-left">
                  KSh. {product.price.toLocaleString()}
                </p>
              </div>

              {/* Bottom Section: Stock Seal */}
              <div className="flex justify-end">
                <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12">
                  {/* Seal Border with dynamic colors */}
                  <div
                    className={`absolute inset-0 rounded-full border backdrop-blur-md ${
                      product.stock < 20
                        ? "border-red-400/30 bg-red-500/10"
                        : product.stock < 50
                        ? "border-yellow-400/30 bg-yellow-500/10"
                        : "border-white/20 bg-white/5"
                    }`}
                  ></div>
                  <div
                    className={`absolute inset-0.5 rounded-full border ${
                      product.stock < 20
                        ? "border-red-400/20"
                        : product.stock < 50
                        ? "border-yellow-400/20"
                        : "border-white/5"
                    }`}
                  ></div>

                  {/* Stock Text with dynamic colors */}
                  <div className="text-center z-20">
                    <div
                      className={`text-base sm:text-lg font-light leading-none ${
                        product.stock < 10
                          ? "text-red-300"
                          : product.stock < 30
                          ? "text-yellow-300"
                          : "text-white"
                      }`}
                    >
                      {product.stock}
                    </div>
                    <div className="text-[6px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">
                      Stock
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle Shine Overlay - Enhanced on hover */}
            <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-transparent pointer-events-none group-hover:via-white/10 transition-all duration-500"></div>

            {/* Additional shine effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
              <div className="absolute -inset-full top-0 h-full w-1/2 transform -skew-x-12 bg-linear-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shine_1.5s_ease-in-out]"></div>
            </div>
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
                No products in this category
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;

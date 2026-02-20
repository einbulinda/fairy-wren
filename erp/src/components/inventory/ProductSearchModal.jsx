import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { inputCls } from "./inventoryUtils";

const ProductSearchModal = ({ products, lines, onSelect, onClose }) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) &&
          !lines.find((l) => l.product_id === p.id),
      ),
    [products, search, lines],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
          <h3 className="text-white font-semibold text-sm">Add Product</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-surface-700">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputCls + " pl-8"}
              placeholder="Search products…"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-surface-400 text-sm">
              {search ? "No products found" : "All products already added"}
            </p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p)}
                className="w-full px-4 py-3 text-left hover:bg-surface-700 transition-colors border-b border-surface-700/50 last:border-0 flex items-center justify-between"
              >
                <span className="text-white text-sm">{p.name}</span>
                <span className="text-surface-400 text-xs ml-3 shrink-0">
                  Stock: {p.current_stock}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSearchModal;

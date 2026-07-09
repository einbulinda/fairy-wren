import { useState, useEffect } from "react";
import api from "../api";

const CURRENCY = "Ksh";

function fmt(price) {
  return `${CURRENCY} ${Number(price).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
}

function ProductCard({ product }) {
  return (
    <div className="bg-night-800 border border-night-600 rounded-2xl overflow-hidden flex flex-col">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-44 object-cover"
          onError={(e) => { e.target.style.display = "none"; }}
        />
      ) : (
        <div className="w-full h-44 bg-night-700 flex items-center justify-center">
          <svg className="w-12 h-12 text-night-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className="p-4 flex flex-col gap-1 flex-1">
        <p className="font-semibold text-white text-sm leading-snug">{product.name}</p>
        {product.unit && (
          <p className="text-xs text-night-400 capitalize">{product.unit}</p>
        )}
        <p className="mt-auto pt-2 text-gold font-bold text-base">{fmt(product.price)}</p>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    api.get("/public/menu")
      .then((res) => {
        const cats = res.data.categories ?? [];
        setCategories(cats);
        if (cats.length) setActiveCategory(cats[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const displayed = activeCategory
    ? categories.filter((c) => c.id === activeCategory)
    : categories;

  return (
    <div className="min-h-screen bg-night-900 text-white font-sans">
      {/* Header */}
      <header className="bg-night-800 border-b border-night-600 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div>
            <h1 className="text-xl font-display font-bold text-gold">Fairy Wren</h1>
            <p className="text-xs text-night-400">Our Menu</p>
          </div>
          {categories.length > 1 && (
            <nav className="flex gap-2 flex-wrap sm:ml-auto">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === null
                    ? "bg-accent text-white"
                    : "bg-night-700 text-night-300 hover:bg-night-600"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat.id
                      ? "bg-accent text-white"
                      : "bg-night-700 text-night-300 hover:bg-night-600"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && categories.length === 0 && (
          <div className="text-center py-24 text-night-400">
            <p className="text-lg">No menu items available yet.</p>
          </div>
        )}

        {!loading && displayed.map((cat) => (
          <section key={cat.id} className="mb-10">
            <h2 className="text-lg font-display font-semibold text-gold-light mb-4 pb-2 border-b border-night-700">
              {cat.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {cat.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="border-t border-night-700 py-6 text-center text-xs text-night-500">
        © {new Date().getFullYear()} Fairy Wren. All rights reserved.
      </footer>
    </div>
  );
}

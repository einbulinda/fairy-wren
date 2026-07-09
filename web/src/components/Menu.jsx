import { useState, useEffect } from "react";
import api from "../api";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

const CURRENCY = "Ksh";

function fmt(price) {
  return `${CURRENCY} ${Number(price).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
}

function ProductCard({ product, delay = 0 }) {
  return (
    <div
      className="glass-card glass-card-hover rounded-2xl overflow-hidden flex flex-col group animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-night-950 h-40">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src="/fairy-logo-only.png"
              alt="Fairy Wren"
              className="h-12 w-auto opacity-10"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}
        {/* Subtle gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-night-900/70 via-transparent to-transparent" />
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-1 flex-1">
        <p className="text-white font-semibold text-[14px] leading-snug group-hover:text-gold-light transition-colors">
          {product.name}
        </p>
        {product.unit && (
          <p className="text-white/30 text-[11px] capitalize tracking-wide">{product.unit}</p>
        )}
        <p className="mt-auto pt-2 text-gold font-bold text-[15px] neon-glow-gold-text">
          {fmt(product.price)}
        </p>
      </div>
    </div>
  );
}

export default function Menu() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2 });
  const { ref: tabsRef, isVisible: tabsVisible } = useScrollAnimation({ threshold: 0.1 });

  useEffect(() => {
    api
      .get("/public/menu")
      .then(({ data }) => {
        const cats = data.categories ?? [];
        setCategories(cats);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const displayed =
    activeCategory === null
      ? categories
      : categories.filter((c) => c.id === activeCategory);

  const totalProducts = categories.reduce((n, c) => n + c.products.length, 0);

  return (
    <section id="menu" className="py-24 px-5 bg-night-800/20 relative overflow-hidden">
      {/* Background ambient orbs */}
      <div className="ambient-orb w-[45vw] h-[45vw] bg-accent/10 top-1/4 -left-20" style={{ animationDelay: "1s" }} />
      <div className="ambient-orb w-[30vw] h-[30vw] bg-gold/8 bottom-10 right-0" style={{ animationDelay: "4s" }} />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <p
            className={`text-[11px] text-gold-light uppercase tracking-[0.3em] font-semibold mb-4 transition-all duration-700 ${
              headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            What We Serve
          </p>
          <h2
            className={`font-display text-4xl md:text-5xl font-bold transition-all duration-700 delay-100 ${
              headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <span className="text-white">Our </span>
            <span className="text-gradient-gold">Menu</span>
          </h2>
          {!loading && totalProducts > 0 && (
            <p
              className={`mt-4 text-white/30 text-[14px] transition-all duration-700 delay-200 ${
                headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              {totalProducts} items across {categories.length} {categories.length === 1 ? "category" : "categories"}
            </p>
          )}
        </div>

        {/* Category tabs */}
        {!loading && categories.length > 1 && (
          <div
            ref={tabsRef}
            className={`flex gap-2 flex-wrap justify-center mb-10 transition-all duration-700 ${
              tabsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-semibold uppercase tracking-wider transition-all duration-300 ${
                activeCategory === null
                  ? "bg-accent text-white neon-glow"
                  : "glass text-white/50 hover:text-white hover:border-accent/40"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold uppercase tracking-wider transition-all duration-300 ${
                  activeCategory === cat.id
                    ? "bg-accent text-white neon-glow"
                    : "glass text-white/50 hover:text-white hover:border-accent/40"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && totalProducts === 0 && (
          <div className="text-center py-20">
            <p className="text-white/20 text-[15px]">Menu coming soon.</p>
          </div>
        )}

        {/* Category sections */}
        {!loading &&
          displayed.map((cat) => (
            <div key={cat.id} className="mb-12 last:mb-0">
              {/* Category header — only shown when "All" is selected */}
              {activeCategory === null && (
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[11px] text-accent-light uppercase tracking-[0.25em] font-semibold whitespace-nowrap">
                    {cat.name}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-accent/30 to-transparent" />
                </div>
              )}

              {/* Products grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {cat.products.map((p, i) => (
                  <ProductCard key={p.id} product={p} delay={i * 60} />
                ))}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

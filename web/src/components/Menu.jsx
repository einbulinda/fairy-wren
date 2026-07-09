import { useState, useEffect } from "react";
import api from "../api";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

function fmt(price) {
  return Number(price).toLocaleString("en-KE", { minimumFractionDigits: 0 });
}

/* Decorative corner bracket rendered as four CSS borders */
function CornerBrackets() {
  const corner = "absolute w-6 h-6 border-gold/40";
  return (
    <>
      <span className={`${corner} top-0 left-0 border-t border-l`} />
      <span className={`${corner} top-0 right-0 border-t border-r`} />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} />
      <span className={`${corner} bottom-0 right-0 border-b border-r`} />
    </>
  );
}

function MenuItem({ product, delay = 0 }) {
  return (
    <div
      className="group flex items-baseline gap-2 py-3 border-b border-white/5 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {/* Name + unit */}
      <div className="min-w-0 shrink-0">
        <span className="text-white/85 text-[13px] tracking-wide group-hover:text-white transition-colors duration-300 font-medium">
          {product.name}
        </span>
        {product.unit && (
          <span className="ml-2 text-[10px] text-accent-light/60 uppercase tracking-widest font-light">
            {product.unit}
          </span>
        )}
      </div>

      {/* Dotted leader */}
      <div className="flex-1 border-b border-dotted border-white/10 mb-[3px]" />

      {/* Price */}
      <span className="shrink-0 text-[13px] font-semibold text-gold tracking-wide">
        {fmt(product.price)}
      </span>
    </div>
  );
}

function CategoryBlock({ cat, index, isAll }) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Category heading */}
      <div className="flex items-center gap-4 mb-1 mt-8 first:mt-0">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-accent-light/70 px-2">
          {cat.name}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>

      {/* Two-column item grid */}
      <div className="grid md:grid-cols-2 gap-x-10">
        {cat.products.map((p, i) => (
          <MenuItem key={p.id} product={p} delay={i * 40} />
        ))}
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
      .then(({ data }) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const displayed =
    activeCategory === null
      ? categories
      : categories.filter((c) => c.id === activeCategory);

  return (
    <section id="menu" className="py-28 px-5 bg-night-900 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="ambient-orb w-[50vw] h-[50vw] bg-accent/8 top-0 -right-32" style={{ animationDelay: "1s" }} />
      <div className="ambient-orb w-[35vw] h-[35vw] bg-gold/6 bottom-0 -left-20" style={{ animationDelay: "3.5s" }} />

      {/* Large background logo watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img
          src="/fairy-wren-logo-removebg.png"
          alt=""
          aria-hidden="true"
          className="w-[55vw] max-w-2xl opacity-[0.03] select-none"
          draggable={false}
        />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">

        {/* ── Section header ── */}
        <div ref={headerRef} className="text-center mb-12">
          <p className={`text-[10px] text-gold-light uppercase tracking-[0.4em] font-semibold mb-5 transition-all duration-700 ${headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            ◈ &nbsp; What We Serve &nbsp; ◈
          </p>
          <h2 className={`font-display text-5xl md:text-6xl font-bold transition-all duration-700 delay-100 ${headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <span className="text-gradient-hero">Our Menu</span>
          </h2>
          <div className={`mt-6 flex items-center gap-4 justify-center transition-all duration-700 delay-200 ${headerVisible ? "opacity-100" : "opacity-0"}`}>
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <img src="/fairy-logo-only.png" alt="Fairy Wren" className="h-5 w-auto opacity-50" draggable={false} />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
        </div>

        {/* ── Category tabs ── */}
        {!loading && categories.length > 1 && (
          <div
            ref={tabsRef}
            className={`flex gap-2 flex-wrap justify-center mb-10 transition-all duration-700 ${tabsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            {[{ id: null, name: "All" }, ...categories].map((cat) => (
              <button
                key={cat.id ?? "__all__"}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 border ${
                  activeCategory === cat.id
                    ? "bg-accent border-accent text-white neon-glow"
                    : "border-white/10 text-white/40 hover:border-accent/50 hover:text-white/80 bg-transparent"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && categories.length === 0 && (
          <p className="text-center text-white/20 text-[14px] py-20 tracking-wide">Menu coming soon.</p>
        )}

        {/* ── Menu card ── */}
        {!loading && categories.length > 0 && (
          <div className="relative glass border border-white/8 rounded-2xl px-6 sm:px-10 py-10">
            {/* Corner brackets */}
            <CornerBrackets />

            {/* Inner faint logo */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl overflow-hidden">
              <img
                src="/fairy-logo-only.png"
                alt=""
                aria-hidden="true"
                className="h-48 w-auto opacity-[0.04] select-none"
                draggable={false}
              />
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-2">
              {/* Ksh label */}
              <p className="text-right text-[10px] text-white/20 uppercase tracking-[0.3em] mb-6">
                Prices in Ksh
              </p>

              {displayed.map((cat, i) => (
                <CategoryBlock
                  key={cat.id}
                  cat={cat}
                  index={i}
                  isAll={activeCategory === null}
                />
              ))}
            </div>

            {/* Bottom signature */}
            <div className="mt-10 flex items-center justify-center gap-3 opacity-25">
              <div className="h-px w-10 bg-gold/60" />
              <span className="text-[9px] uppercase tracking-[0.4em] text-gold font-semibold">Fairy Wren</span>
              <div className="h-px w-10 bg-gold/60" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

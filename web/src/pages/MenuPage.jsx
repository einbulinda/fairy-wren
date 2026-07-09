import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api";

function fmt(price) {
  return Number(price).toLocaleString("en-KE", { minimumFractionDigits: 0 });
}

function CornerBrackets() {
  const c = "absolute w-6 h-6 border-gold/40";
  return (
    <>
      <span className={`${c} top-0 left-0 border-t border-l`} />
      <span className={`${c} top-0 right-0 border-t border-r`} />
      <span className={`${c} bottom-0 left-0 border-b border-l`} />
      <span className={`${c} bottom-0 right-0 border-b border-r`} />
    </>
  );
}

function MenuItem({ product }) {
  return (
    <div className="group flex items-baseline gap-2 py-3 border-b border-white/5 last:border-0">
      <div className="min-w-0 shrink-0">
        <span className="text-white/85 text-[13px] tracking-wide font-medium group-hover:text-white transition-colors duration-300">
          {product.name}
        </span>
        {product.unit && (
          <span className="ml-2 text-[10px] text-accent-light/60 uppercase tracking-widest font-light">
            {product.unit}
          </span>
        )}
      </div>
      <div className="flex-1 border-b border-dotted border-white/10 mb-[3px]" />
      <span className="shrink-0 text-[13px] font-semibold text-gold tracking-wide">
        {fmt(product.price)}
      </span>
    </div>
  );
}

function CategorySection({ cat }) {
  return (
    <div id={`menu-cat-${cat.id}`}>
      <div className="flex items-center gap-4 mb-1 mt-10 first:mt-0">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-accent-light/70 px-2">
          {cat.name}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>
      <div className="grid md:grid-cols-2 gap-x-10">
        {cat.products.map((p) => (
          <MenuItem key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

const HEADER_H = 72;   // sticky header height
const NAV_H    = 52;   // sticky category nav height
const OFFSET   = HEADER_H + NAV_H + 16;

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const navRef  = useRef(null);
  const pillRefs = useRef({});

  useEffect(() => {
    api.get("/public/menu")
      .then((res) => {
        const cats = res.data.categories ?? [];
        setCategories(cats);
        if (cats.length) setActiveId(cats[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* Scroll spy */
  useEffect(() => {
    if (!categories.length) return;
    const observers = categories.map((cat) => {
      const el = document.getElementById(`menu-cat-${cat.id}`);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveId(cat.id); },
        { rootMargin: `-${OFFSET}px 0px -50% 0px`, threshold: 0 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, [categories]);

  /* Keep active pill scrolled into view in the sticky nav */
  useEffect(() => {
    const pill = pillRefs.current[activeId];
    const nav  = navRef.current;
    if (!pill || !nav) return;
    const pl = pill.offsetLeft, pr = pl + pill.offsetWidth;
    const nl = nav.scrollLeft, nr = nl + nav.offsetWidth;
    if (pl < nl) nav.scrollTo({ left: pl - 16, behavior: "smooth" });
    else if (pr > nr) nav.scrollTo({ left: pr - nav.offsetWidth + 16, behavior: "smooth" });
  }, [activeId]);

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(`menu-cat-${id}`);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - OFFSET, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-night-900 text-white font-sans">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-30 bg-night-900/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-5 h-[72px] flex items-center gap-4">
          <img src="/fairy-logo-only.png" alt="Fairy Wren" className="h-8 w-auto opacity-80" draggable={false} />
          <div>
            <p className="font-display font-bold text-[17px] text-white leading-none tracking-wide">Fairy Wren</p>
            <p className="text-[10px] text-gold/60 uppercase tracking-[0.25em] mt-0.5">Our Menu</p>
          </div>
          {!loading && (
            <p className="ml-auto text-[11px] text-white/20 tracking-wide">
              Prices in Ksh
            </p>
          )}
        </div>

        {/* Sticky category nav */}
        {!loading && categories.length > 1 && (
          <div className="border-t border-white/5">
            <div
              ref={navRef}
              className="max-w-4xl mx-auto px-5 flex gap-2 py-2.5 overflow-x-auto scrollbar-hide"
            >
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  ref={(el) => { pillRefs.current[cat.id] = el; }}
                  onClick={() => scrollTo(cat.id)}
                  className={`shrink-0 px-5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 border ${
                    activeId === cat.id
                      ? "bg-accent border-accent text-white shadow-[0_0_12px_rgba(124,58,237,0.5)]"
                      : "border-white/10 text-white/40 hover:border-accent/50 hover:text-white/80 bg-transparent"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Main content ── */}
      <main className="max-w-4xl mx-auto px-5 py-10 pb-24 relative">
        {/* Background logo watermark */}
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-[0.08]">
          <img src="/fairy-wren-logo-removebg.png" alt="" aria-hidden="true" className="w-[70vw] max-w-xl select-none" draggable={false} />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {!loading && categories.length === 0 && (
          <p className="text-center py-32 text-white/20 text-[15px] tracking-wide">Menu coming soon.</p>
        )}

        {!loading && categories.length > 0 && (
          <div className="relative glass border border-white/8 rounded-2xl px-6 sm:px-10 py-10">
            <CornerBrackets />

            {/* Inner logo */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl overflow-hidden">
              <img src="/fairy-logo-only.png" alt="" aria-hidden="true" className="h-48 w-auto opacity-[0.10] select-none" draggable={false} />
            </div>

            <div className="relative z-10">
              {categories.map((cat) => (
                <CategorySection key={cat.id} cat={cat} />
              ))}
            </div>

            <div className="relative z-10 mt-10 flex items-center justify-center gap-3 opacity-20">
              <div className="h-px w-10 bg-gold/80" />
              <span className="text-[9px] uppercase tracking-[0.4em] text-gold font-semibold">Fairy Wren</span>
              <div className="h-px w-10 bg-gold/80" />
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-[11px] text-white/15 tracking-wide border-t border-white/5">
        © {new Date().getFullYear()} Fairy Wren
      </footer>
    </div>
  );
}

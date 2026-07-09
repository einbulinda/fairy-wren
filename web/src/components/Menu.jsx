import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

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

function MenuItem({ product, delay = 0 }) {
  return (
    <div
      className="group flex items-baseline gap-2 py-3 border-b border-white/5 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
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

function CategoryBlock({ cat }) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.08 });

  return (
    <div
      id={`menu-cat-${cat.id}`}
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      <div className="flex items-center gap-4 mb-1 mt-10 first:mt-0">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-accent-light/70 px-2">
          {cat.name}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>
      <div className="grid md:grid-cols-2 gap-x-10">
        {cat.products.map((p, i) => (
          <MenuItem key={p.id} product={p} delay={i * 40} />
        ))}
      </div>
    </div>
  );
}

const NAVBAR_H = 64;   // h-16 fixed navbar
const STICKY_H = 52;   // approximate sticky nav height
const SCROLL_OFFSET = NAVBAR_H + STICKY_H + 20;

export default function Menu() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const navRef = useRef(null);
  const pillRefs = useRef({});       // id → pill button

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2 });

  useEffect(() => {
    api
      .get("/public/menu")
      .then(({ data }) => {
        const cats = data.categories ?? [];
        setCategories(cats);
        if (cats.length) setActiveId(cats[0].id);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  /* ── Scroll spy via IntersectionObserver ── */
  useEffect(() => {
    if (!categories.length) return;

    const observers = [];
    categories.forEach((cat) => {
      const el = document.getElementById(`menu-cat-${cat.id}`);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(cat.id);
        },
        { rootMargin: `-${NAVBAR_H + STICKY_H}px 0px -50% 0px`, threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [categories]);

  /* ── Keep active pill in view inside the sticky nav ── */
  useEffect(() => {
    const pill = pillRefs.current[activeId];
    const nav = navRef.current;
    if (!pill || !nav) return;
    const pillLeft = pill.offsetLeft;
    const pillRight = pillLeft + pill.offsetWidth;
    const navLeft = nav.scrollLeft;
    const navRight = navLeft + nav.offsetWidth;
    if (pillLeft < navLeft) nav.scrollTo({ left: pillLeft - 16, behavior: "smooth" });
    else if (pillRight > navRight) nav.scrollTo({ left: pillRight - nav.offsetWidth + 16, behavior: "smooth" });
  }, [activeId]);

  const scrollToCategory = useCallback((id) => {
    const el = document.getElementById(`menu-cat-${id}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  return (
    <section id="menu" className="py-28 px-5 bg-night-900 relative">
      {/* Orbs + watermark — overflow-hidden scoped here so sticky works */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ambient-orb w-[50vw] h-[50vw] bg-accent/8 top-0 -right-32" style={{ animationDelay: "1s" }} />
        <div className="ambient-orb w-[35vw] h-[35vw] bg-gold/6 bottom-0 -left-20" style={{ animationDelay: "3.5s" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/fairy-wren-logo-removebg.png"
            alt=""
            aria-hidden="true"
            className="w-[55vw] max-w-2xl opacity-[0.09] select-none"
            draggable={false}
          />
        </div>
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

        {/* ── Sticky category nav ── */}
        {!loading && categories.length > 1 && (
          <div className="sticky top-16 z-20 -mx-5 px-5 mb-8">
            {/* Glass backdrop strip */}
            <div className="absolute inset-0 bg-night-900/80 backdrop-blur-md border-b border-white/5" />
            <div
              ref={navRef}
              className="relative flex gap-2 py-3 overflow-x-auto scrollbar-hide"
            >
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  ref={(el) => { pillRefs.current[cat.id] = el; }}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`shrink-0 px-5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 border ${
                    activeId === cat.id
                      ? "bg-accent border-accent text-white neon-glow"
                      : "border-white/10 text-white/40 hover:border-accent/50 hover:text-white/80 bg-transparent"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
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
            <CornerBrackets />

            {/* Inner logo watermark */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl overflow-hidden">
              <img
                src="/fairy-logo-only.png"
                alt=""
                aria-hidden="true"
                className="h-48 w-auto opacity-[0.10] select-none"
                draggable={false}
              />
            </div>

            <div className="relative z-10">
              <p className="text-right text-[10px] text-white/20 uppercase tracking-[0.3em] mb-2">
                Prices in Ksh
              </p>

              {categories.map((cat) => (
                <CategoryBlock key={cat.id} cat={cat} />
              ))}
            </div>

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

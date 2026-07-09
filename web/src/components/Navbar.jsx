import { useState, useEffect } from "react";
import { Menu, X } from "./icons";

const NAV_LINKS = [
  { href: "#events", label: "Events" },
  { href: "#gallery", label: "Gallery" },
  { href: "#menu", label: "Menu" },
  { href: "#reviews", label: "Reviews" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (e, href) => {
    e.preventDefault();
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-night-900/95 backdrop-blur-md border-b border-white/5 shadow-2xl"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="flex items-center gap-2.5"
        >
          <img src="/fairy-logo-only.png" alt="Fairy Wren" className="h-9 w-auto" />
          <span className="font-display text-[18px] font-bold text-white tracking-wide">
            Fairy Wren
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => handleNav(e, l.href)}
              className="text-[13px] text-white/70 hover:text-white transition-colors tracking-wide uppercase font-medium"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <a
          href="#reserve"
          onClick={(e) => handleNav(e, "#reserve")}
          className="hidden md:inline-flex items-center px-5 py-2 rounded-full bg-accent hover:bg-accent-dark text-white text-[13px] font-semibold transition-colors"
        >
          Reserve a Table
        </a>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden p-2 text-white/80 hover:text-white"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-night-800 border-t border-white/5">
          <nav className="flex flex-col px-5 py-4 gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => handleNav(e, l.href)}
                className="py-3 text-[14px] text-white/80 hover:text-white border-b border-white/5 tracking-wide"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#reserve"
              onClick={(e) => handleNav(e, "#reserve")}
              className="mt-3 flex items-center justify-center py-3 rounded-full bg-accent text-white text-[14px] font-semibold"
            >
              Reserve a Table
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

import { Instagram, Facebook } from "./icons";
const NAV = ["Events", "Gallery", "Reviews", "About", "Contact"];

const scrollTo = (id) =>
  document.getElementById(id.toLowerCase())?.scrollIntoView({ behavior: "smooth" });

export default function Footer() {
  return (
    <footer className="bg-night-950 border-t border-white/5 pt-16 pb-8 px-5 relative overflow-hidden">
      {/* Background ambient orb */}
      <div className="ambient-orb w-[30vw] h-[30vw] bg-accent/5 bottom-0 left-1/2 -translate-x-1/2" style={{ animationDelay: "1s" }} />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid md:grid-cols-3 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="/fairy-logo-only.png"
                alt="Fairy Wren"
                className="h-9 w-auto"
              />
              <span className="font-display text-[18px] font-bold text-white">
                Fairy Wren
              </span>
            </div>
            <p className="text-[13px] text-white/35 leading-relaxed max-w-xs">
              Nairobi's premier bar lounge. Cold drinks, great music, and real
              vibes — every night.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-[11px] text-white/30 uppercase tracking-[0.25em] font-semibold mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {NAV.map((n) => (
                <li key={n}>
                  <button
                    onClick={() => scrollTo(n)}
                    className="text-[13px] text-white/45 hover:text-accent-light transition-colors"
                  >
                    {n}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & newsletter */}
          <div>
            <h4 className="text-[11px] text-white/30 uppercase tracking-[0.25em] font-semibold mb-4">
              Follow Us
            </h4>
            <div className="flex gap-3 mb-8">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl glass hover:border-accent/40 flex items-center justify-center text-white/40 hover:text-accent-light transition-all hover:scale-110"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://facebook.com"
                target="https://web.facebook.com/share/1CvwYF4x3o/"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl glass hover:border-accent/40 flex items-center justify-center text-white/40 hover:text-accent-light transition-all hover:scale-110"
              >
                <Facebook size={18} />
              </a>
              {/* TikTok */}
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl glass hover:border-accent/40 flex items-center justify-center text-white/40 hover:text-accent-light transition-all hover:scale-110"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z" />
                </svg>
              </a>
            </div>

            <h4 className="text-[11px] text-white/30 uppercase tracking-[0.25em] font-semibold mb-3">
              Stay Updated
            </h4>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 glass rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-accent/40"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-dark text-white text-[12px] font-semibold transition-all neon-glow-hover"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[12px] text-white/20">
            © {new Date().getFullYear()} Fairy Wren. All rights reserved.
          </p>
          <p className="text-[12px] text-white/15">
            Drink responsibly. 18+ only.
          </p>
        </div>
      </div>
    </footer>
  );
}

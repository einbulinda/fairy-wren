const HIGHLIGHTS = [
  { value: "100+", label: "Drinks Varieties" },
  { value: "11am – 1am", label: "Open Daily" },
  { value: "Live DJs", label: "Every Friday & Saturday" },
  { value: "18+", label: "Entry Policy" },
];

export default function About() {
  return (
    <section id="about" className="py-24 px-5 relative overflow-hidden">
      {/* Background ambient orb */}
      <div className="ambient-orb w-[30vw] h-[30vw] bg-accent/10 top-1/2 -left-20" style={{ animationDelay: "1s" }} />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div>
            <p className="text-[11px] text-gold-light uppercase tracking-[0.3em] font-semibold mb-4">
              Our Story
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              More Than a Bar —<br />
              <span className="italic text-gradient-gold">It's a Feeling</span>
            </h2>
            <div className="space-y-4 text-[15px] text-white/60 leading-relaxed">
              <p>
                Fairy Wren is where Nairobi unwinds. Set in a beautifully
                crafted space of warm wood, dark walls, and ambient blue light,
                we've built an atmosphere that feels both intimate and alive.
              </p>
              <p>
                Whether you're here for a quiet evening with friends, a
                corporate wind-down, or a full night of dancing to our resident
                DJs — we promise you won't want to leave.
              </p>
              <p>Cold drinks. Great music. Real vibes.</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.label}
                className="glass-card glass-card-hover rounded-2xl p-7 flex flex-col gap-1"
              >
                <span className="font-display text-3xl font-bold text-gradient-gold">
                  {h.value}
                </span>
                <span className="text-[13px] text-white/50 uppercase tracking-wider">
                  {h.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

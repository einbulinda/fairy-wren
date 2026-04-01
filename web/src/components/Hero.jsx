export default function Hero() {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background: venue seating photo with dark overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/gallery/seating.jpg')" }}
      />
      {/* Multi-layer overlay to create the dark moody look */}
      <div className="absolute inset-0 bg-gradient-to-b from-night-950/80 via-night-950/70 to-night-950/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-night-950/60 via-transparent to-night-950/60" />

      {/* Animated ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Purple orb - top right */}
        <div
          className="ambient-orb w-[40vw] h-[40vw] bg-accent/30 -top-20 -right-20"
          style={{ animationDelay: "0s", animationDuration: "10s" }}
        />
        {/* Gold orb - bottom left */}
        <div
          className="ambient-orb w-[30vw] h-[30vw] bg-gold/20 bottom-20 -left-10"
          style={{ animationDelay: "2s", animationDuration: "12s" }}
        />
        {/* Blue orb - center bottom */}
        <div
          className="ambient-orb w-[50vw] h-[30vh] bg-blue-900/20 bottom-0 left-1/2 -translate-x-1/2"
          style={{ animationDelay: "4s", animationDuration: "8s" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-5 max-w-4xl mx-auto pt-24">
        <p className="text-[11px] text-gold-light uppercase tracking-[0.35em] font-semibold mb-6 animate-fade-in">
          Nairobi's Premier Bar Lounge
        </p>

        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6 text-balance">
          <span className="block animate-slide-up text-white">
            Where Every Night
          </span>
          <span className="block animate-slide-up italic text-gradient-hero neon-text-glow">
            Tells a Story
          </span>
        </h1>

        <p className="text-[15px] md:text-[17px] text-white/60 leading-relaxed max-w-xl mx-auto mb-10 animate-slide-up">
          Premium drinks, live DJs, and an atmosphere that keeps you coming
          back. Book your table and make it a night to remember.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
          <button
            onClick={() => scrollTo("events")}
            className="group relative w-full sm:w-auto px-8 py-4 rounded-full bg-accent hover:bg-accent-dark text-white font-semibold text-[14px] transition-all duration-300 hover:scale-105 neon-glow neon-glow-hover overflow-hidden"
          >
            <span className="relative z-10">See Upcoming Events</span>
            <div className="absolute inset-0 bg-gradient-to-r from-accent-light/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
          <button
            onClick={() => scrollTo("reserve")}
            className="group w-full sm:w-auto px-8 py-4 rounded-full border border-white/20 hover:border-accent/50 text-white font-semibold text-[14px] transition-all duration-300 backdrop-blur-md hover:bg-white/5"
          >
            Reserve a Table
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in">
          <div className="w-px h-12 bg-gradient-to-b from-white/0 via-white/40 to-white/0 animate-bounce-slow" />
          <span className="text-[10px] text-white/30 uppercase tracking-[0.2em]">
            Scroll
          </span>
        </div>
      </div>
    </section>
  );
}

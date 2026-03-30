import { useState, useEffect, useRef } from "react";
import { Star, ChevronLeft, ChevronRight } from "./icons";
import testimonials from "../data/testimonials.json";
const Stars = ({ rating }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={n <= rating ? "text-gold-light" : "text-white/10"}>
        <Star size={14} filled={n <= rating} />
      </span>
    ))}
  </div>
);

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const next = () => setCurrent((c) => (c + 1) % testimonials.length);
  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);

  // Auto-advance every 5s
  useEffect(() => {
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 5000);
  };

  const go = (fn) => { fn(); resetTimer(); };

  const t = testimonials[current];

  return (
    <section id="reviews" className="py-24 px-5 bg-night-800/30 relative overflow-hidden">
      {/* Background ambient orbs */}
      <div className="ambient-orb w-[30vw] h-[30vw] bg-accent/10 top-10 -left-20" style={{ animationDelay: "0s" }} />
      <div className="ambient-orb w-[25vw] h-[25vw] bg-gold/10 bottom-10 -right-10" style={{ animationDelay: "4s" }} />
      
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-[11px] text-gold-light uppercase tracking-[0.3em] font-semibold mb-4">
            What People Say
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold">
            <span className="text-white">Guest </span>
            <span className="text-gradient-purple">Reviews</span>
          </h2>
        </div>

        {/* Carousel */}
        <div className="relative glass-card rounded-3xl p-8 md:p-12 text-center">
          {/* Quote mark */}
          <span className="absolute top-6 left-8 font-display text-7xl text-accent/20 leading-none select-none">
            "
          </span>

          <div key={t.id} className="animate-fade-in">
            <Stars rating={t.rating} />
            <blockquote className="text-white/75 text-[16px] md:text-[18px] leading-relaxed mt-6 mb-8 font-light italic">
              "{t.text}"
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
                <span className="text-accent-light text-[14px] font-semibold">
                  {t.name.charAt(0)}
                </span>
              </div>
              <span className="text-white text-[14px] font-medium">{t.name}</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => go(prev)}
              className="p-2 rounded-full border border-white/10 hover:border-accent/40 text-white/40 hover:text-white transition-all hover:bg-white/5"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrent(i); resetTimer(); }}
                  className={`rounded-full transition-all ${
                    i === current
                      ? "w-6 h-2 bg-gradient-to-r from-accent to-accent-light"
                      : "w-2 h-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => go(next)}
              className="p-2 rounded-full border border-white/10 hover:border-accent/40 text-white/40 hover:text-white transition-all hover:bg-white/5"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* CTA to leave feedback */}
        <p className="text-center mt-8 text-[13px] text-white/30">
          Had a great time?{" "}
          <button
            onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
            className="text-accent-light hover:text-white transition-colors underline underline-offset-2"
          >
            Share your experience
          </button>
        </p>
      </div>
    </section>
  );
}

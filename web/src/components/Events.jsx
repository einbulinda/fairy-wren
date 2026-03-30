import { useState, useEffect } from "react";
import { Calendar, Clock } from "./icons";
import api from "../api";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

const formatDate = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const FALLBACK_LOGOS = ["/fairy-logo-only.png", "/fairy-wren-logo.jpeg"];

const EventCard = ({ event, index = 0, past = false, delay = 0 }) => (
  <div
    className={`relative overflow-hidden rounded-2xl border transition-all duration-700 group animate-slide-up ${
      past
        ? "border-white/5 bg-night-800/50 opacity-70 hover:opacity-90"
        : "glass-card glass-card-hover hover:border-accent/40"
    }`}
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
  >
    {/* Event image or gradient placeholder */}
    <div className="relative overflow-hidden bg-night-950">
      {event.image_url ? (
        <img
          src={event.image_url}
          alt={event.title}
          className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-night-700 via-night-800 to-night-600 flex items-center justify-center">
          <img
            src={FALLBACK_LOGOS[index % FALLBACK_LOGOS.length]}
            alt="Fairy Wren"
            className="h-20 w-auto opacity-20"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      )}
      {past && (
        <div className="absolute inset-0 bg-night-950/50 flex items-center justify-center">
          <span className="px-3 py-1 rounded-full glass text-white/50 text-[11px] font-medium uppercase tracking-wider">
            Past Event
          </span>
        </div>
      )}
      {!past && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-accent/90 text-white text-[10px] font-bold uppercase tracking-wider neon-glow">
          Upcoming
        </div>
      )}
    </div>

    <div className="p-5">
      <h3 className="text-white font-semibold text-[16px] mb-1 group-hover:text-gold-light transition-colors">
        {event.title}
      </h3>
      {event.dj_act && (
        <p className="text-accent-light text-[12px] font-medium mb-3">
          {event.dj_act}
        </p>
      )}
      <div className="flex flex-col gap-1.5 text-[12px] text-white/50 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={12} />
          <span>{formatDate(event.event_date)}</span>
        </div>
        {event.start_time && (
          <div className="flex items-center gap-2">
            <Clock size={12} />
            <span>
              {event.start_time.slice(0, 5)}
              {event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ""}
            </span>
          </div>
        )}
      </div>
      {event.description && (
        <p className="text-white/40 text-[13px] leading-relaxed line-clamp-2 mb-4">
          {event.description}
        </p>
      )}
      {!past && event.ticket_url && (
        <a
          href={event.ticket_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 rounded-full bg-accent hover:bg-accent-dark text-white text-[12px] font-semibold transition-all hover:scale-105 neon-glow-hover"
        >
          Get Tickets
        </a>
      )}
    </div>
  </div>
);

export default function Events() {
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2 });

  useEffect(() => {
    api
      .get("/public/events")
      .then(({ data }) => {
        setUpcoming(data.upcoming || []);
        setPast(data.past || []);
      })
      .catch(() => {
        // Silently fail — show empty state
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="events" className="py-24 px-5 bg-night-800/30 relative overflow-hidden">
      {/* Background ambient orb */}
      <div className="ambient-orb w-[40vw] h-[40vw] bg-gold/10 top-0 right-0" style={{ animationDelay: "2s" }} />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-14">
          <p 
            className={`text-[11px] text-gold-light uppercase tracking-[0.3em] font-semibold mb-4 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            What's On
          </p>
          <h2 
            className={`font-display text-4xl md:text-5xl font-bold transition-all duration-700 delay-100 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <span className="text-white">Upcoming </span>
            <span className="text-gradient-purple">Events</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/30 text-[15px]">
              No upcoming events at the moment.
            </p>
            <p className="text-white/20 text-[13px] mt-1">
              Check back soon — big nights are always in the works.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map((ev, i) => (
              <EventCard 
                key={ev.id} 
                event={ev} 
                index={i} 
                delay={i * 100}
              />
            ))}
          </div>
        )}

        {/* Past events toggle */}
        {past.length > 0 && (
          <div className="mt-16">
            <button
              onClick={() => setShowPast((s) => !s)}
              className="flex items-center gap-2 mx-auto text-[13px] text-white/40 hover:text-white/70 transition-colors border-b border-white/10 pb-1 hover:border-accent/40"
            >
              {showPast ? "Hide" : "Show"} Past Events ({past.length})
            </button>

            {showPast && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {past.map((ev, i) => (
                  <EventCard key={ev.id} event={ev} index={i} past />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

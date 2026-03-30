import { Clock, MapPin } from "./icons";

const INFO = [
  {
    icon: Clock,
    title: "Opening Hours",
    lines: ["Mon – Thu: 5pm – 1am", "Fri – Sat: 5pm – 3am", "Sunday: 4pm – 12am"],
  },
  {
    icon: MapPin,
    title: "Location",
    lines: ["Kiguathi Rd, Utawala", "Nairobi, Kenya", "Find us on Google Maps →"],
    link: "https://maps.app.goo.gl/phiHuhCykNXrxFkV9",
  },
  {
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      </svg>
    ),
    title: "Dress Code",
    lines: ["Smart casual & above", "No sportswear or flip-flops"],
  },
  {
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    title: "Entry Policy",
    lines: ["18+ only", "Valid ID required at the door"],
  },
];

export default function InfoStrip() {
  return (
    <section className="py-16 px-5 border-t border-b border-white/5 relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {INFO.map((item) => (
            <div 
              key={item.title} 
              className="flex flex-col gap-3"
            >
              <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent-light">
                <item.icon size={22} />
              </div>
              <div>
                <h3 className="text-white text-[13px] font-semibold mb-1.5">{item.title}</h3>
                {item.lines.map((line, i) =>
                  item.link && i === item.lines.length - 1 ? (
                    <a
                      key={i}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[12px] text-accent-light hover:text-white transition-colors"
                    >
                      {line}
                    </a>
                  ) : (
                    <p key={i} className="text-[12px] text-white/40 leading-relaxed">{line}</p>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

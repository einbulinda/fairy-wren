import { useState, useEffect } from "react";
import { X } from "./icons";
import api from "../api";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2 });
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });

  useEffect(() => {
    api
      .get("/public/gallery")
      .then(({ data }) => setImages(data.images || []))
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="gallery" className="py-24 px-5 relative overflow-hidden">
      {/* Background ambient orb */}
      <div className="ambient-orb w-[35vw] h-[35vw] bg-accent/15 bottom-0 left-1/4" style={{ animationDelay: "3s" }} />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-14">
          <p 
            className={`text-[11px] text-gold-light uppercase tracking-[0.3em] font-semibold mb-4 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            The Space
          </p>
          <h2 
            className={`font-display text-4xl md:text-5xl font-bold transition-all duration-700 delay-100 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <span className="text-white">Inside </span>
            <span className="text-gradient-gold">Fairy Wren</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : images.length === 0 ? (
          <p className="text-center text-white/20 py-16 text-[14px]">Gallery coming soon.</p>
        ) : (
          <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {images.map((img, i) => (
              <div
                key={img.id}
                className="relative overflow-hidden rounded-xl group cursor-pointer h-64 md:h-96"
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => setLightbox(img)}
              >
                <img
                  src={img.url}
                  alt={img.caption || "Fairy Wren"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 img-interactive"
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                />
                {/* Hover overlay with glass effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-night-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-4">
                  {img.caption && (
                    <span className="text-white text-[13px] font-medium translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      {img.caption}
                    </span>
                  )}
                </div>
                {/* Border glow on hover */}
                <div className="absolute inset-0 border-2 border-accent/0 group-hover:border-accent/50 rounded-xl transition-all duration-300" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox with enhanced glass effect */}
      {lightbox && (
        <div
          className="fixed inset-0 glass-dark z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-5 right-5 text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X size={24} />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.caption || "Fairy Wren"}
            className="max-w-full max-h-[90vh] rounded-xl object-contain animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
          {lightbox.caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-[13px]">
              {lightbox.caption}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

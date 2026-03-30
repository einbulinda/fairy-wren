import { useState, useEffect } from "react";

const WhatsAppIcon = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const CloseIcon = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Show tooltip after 3 seconds on first load
  useEffect(() => {
    const hasSeenTooltip = sessionStorage.getItem("whatsapp-tooltip-seen");
    if (!hasSeenTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        sessionStorage.setItem("whatsapp-tooltip-seen", "true");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Hide tooltip when opening chat
  useEffect(() => {
    if (isOpen) setShowTooltip(false);
  }, [isOpen]);

  const phoneNumber = "254718832394";
  const message = "Hi! I'd like to make a reservation at Fairy Wren.";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  const quickReplies = [
    { label: "Book a Table", message: "Hi! I'd like to book a table for tonight." },
    { label: "Event Info", message: "Hi! Can you tell me about upcoming events?" },
    { label: "Special Offers", message: "Hi! Do you have any special offers today?" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Tooltip */}
      {showTooltip && !isOpen && (
        <div 
          className="bg-white text-night-900 px-4 py-2 rounded-xl shadow-lg text-[13px] font-medium animate-fade-in whitespace-nowrap"
          style={{ animation: "slideInRight 0.3s ease-out" }}
        >
          <div className="flex items-center gap-2">
            <span>💬 Chat with us on WhatsApp</span>
            <button 
              onClick={() => setShowTooltip(false)}
              className="text-night-900/50 hover:text-night-900"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Quick Reply Options */}
      {isOpen && (
        <div className="mb-2 space-y-2 animate-slide-up">
          {quickReplies.map((reply) => (
            <a
              key={reply.label}
              href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(reply.message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white text-night-900 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {reply.label}
            </a>
          ))}
        </div>
      )}

      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
        aria-label="Chat on WhatsApp"
      >
        {/* Ripple effect */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
        
        {/* Glow effect */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] blur-md opacity-50 group-hover:opacity-70 transition-opacity" />
        
        <WhatsAppIcon size={28} />
      </button>
    </div>
  );
}

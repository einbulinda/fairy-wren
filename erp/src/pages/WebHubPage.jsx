import { useState } from "react";
import { useLocation } from "react-router";
import { CalendarDays, Images, MessageSquare, CalendarCheck, UtensilsCrossed } from "lucide-react";
import WebEventsPage from "./WebEventsPage";
import WebGalleryPage from "./WebGalleryPage";
import WebFeedbackPage from "./WebFeedbackPage";
import WebReservationsPage from "./WebReservationsPage";
import WebMenuPage from "./WebMenuPage";

const TABS = [
  { key: "events", label: "Events", short: "Events", icon: CalendarDays, component: WebEventsPage },
  { key: "gallery", label: "Gallery", short: "Gallery", icon: Images, component: WebGalleryPage },
  { key: "menu", label: "Menu", short: "Menu", icon: UtensilsCrossed, component: WebMenuPage },
  { key: "feedback", label: "Customer Feedback", short: "Feedback", icon: MessageSquare, component: WebFeedbackPage },
  { key: "reservations", label: "Reservations", short: "Reserve", icon: CalendarCheck, component: WebReservationsPage },
];

const WebHubPage = () => {
  const { state } = useLocation();
  const [activeTab, setActiveTab] = useState(state?.tab ?? "events");
  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.component;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="border-b border-surface-700 overflow-x-auto scrollbar-hide">
        <nav className="flex gap-1 min-w-max">
          {TABS.map(({ key, label, short, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-surface-400 hover:text-white"
              }`}
            >
              <Icon size={15} />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
};

export default WebHubPage;

import { useState } from "react";
import { useLocation } from "react-router";
import { CalendarDays, Images, MessageSquare, CalendarCheck } from "lucide-react";
import WebEventsPage from "./WebEventsPage";
import WebGalleryPage from "./WebGalleryPage";
import WebFeedbackPage from "./WebFeedbackPage";
import WebReservationsPage from "./WebReservationsPage";

const TABS = [
  { key: "events", label: "Events", icon: CalendarDays, component: WebEventsPage },
  { key: "gallery", label: "Gallery", icon: Images, component: WebGalleryPage },
  { key: "feedback", label: "Customer Feedback", icon: MessageSquare, component: WebFeedbackPage },
  { key: "reservations", label: "Reservations", icon: CalendarCheck, component: WebReservationsPage },
];

const WebHubPage = () => {
  const { state } = useLocation();
  const [activeTab, setActiveTab] = useState(state?.tab ?? "events");
  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.component;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="border-b border-surface-700">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-surface-400 hover:text-white"
              }`}
            >
              <Icon size={15} />
              {label}
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

import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";

const TZ = "Africa/Nairobi";

const getGreeting = () => {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: TZ }).format(new Date()),
    10,
  );
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const WelcomeCard = ({ userName }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = time.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TZ,
  });

  const timeStr = time.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: TZ,
  });

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <p className="text-primary-400 text-xs font-semibold uppercase tracking-wider mb-1">
          {getGreeting()},
        </p>
        <h2 className="text-white text-xl font-bold truncate">
          {userName || "Owner"}!
        </h2>
      </div>
      <div className="flex items-center gap-4 mt-auto pt-4">
        <div className="flex items-center gap-1.5 text-surface-400">
          <Calendar size={14} />
          <span className="text-xs">{dateStr}</span>
        </div>
        <div className="flex items-center gap-1.5 text-surface-400">
          <Clock size={14} />
          <span className="text-xs font-mono">{timeStr}</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;

import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";

const getGreeting = () => {
  const hour = new Date().getHours();
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

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
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

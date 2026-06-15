// Re-export formatCurrency as formatKES for convenience
export { formatCurrency as formatKES } from "./common";

// Additional formatters
export const formatNumber = (value, decimals = 0) =>
  new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value || 0);

const TZ = "Africa/Nairobi";

export const formatDate = (dateStr, options = {}) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
    ...options,
  });
};

export const formatTime = (dateStr) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
};

/** Returns YYYY-MM-DD in Africa/Nairobi time — safe replacement for toISOString().split("T")[0] */
export const localDateStr = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

export const formatDuration = (minutes) => {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

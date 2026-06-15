export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
  }).format(value ?? 0);

export const fmt = (n) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

export const fmtNumber = (n) =>
  new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);

const TZ = "Africa/Nairobi";

export const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });
};

export const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
};

export const fmtTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
};

/** Returns YYYY-MM-DD in Africa/Nairobi time — safe replacement for toISOString().split("T")[0] */
export const localDateStr = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

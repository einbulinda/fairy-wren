import api from "@/api";

// GET /system-logs?date=YYYY-MM-DD&levels=error,warn&q=&limit=
// → { date, entries (newest first), matched, truncated, counts, lastErrorAt, files, serverTime }
export const fetchSystemLogs = async (params = {}) => {
  const { data } = await api.get("/system-logs", { params });
  return data.data;
};

// Raw log file → browser download (needs the auth header, so not a plain link).
export const downloadLogFile = async (name) => {
  const res = await api.get(`/system-logs/files/${encodeURIComponent(name)}`, {
    responseType: "blob",
    timeout: 2 * 60 * 1000,
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

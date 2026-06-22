import api from "@/api";

export const fetchPeriods = async (params = {}) => {
  const { data } = await api.get("/periods", { params });
  return data.periods ?? [];
};

export const getCurrentPeriodStatus = async () => {
  const { data } = await api.get("/periods/status/current");
  return data;
};

export const generatePeriods = async (year) => {
  const { data } = await api.post("/periods/generate", { year });
  return data;
};

export const closePeriod = async (year, month, notes = "") => {
  const { data } = await api.post(`/periods/${year}/${month}/close`, { notes });
  return data;
};

export const reopenPeriod = async (year, month, reason) => {
  const { data } = await api.post(`/periods/${year}/${month}/reopen`, { reason });
  return data;
};

export const getPeriodStats = async (year, month) => {
  const { data } = await api.get(`/periods/${year}/${month}/stats`);
  return data;
};

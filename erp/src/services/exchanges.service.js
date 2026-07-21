import api from "@/api";

export const fetchPartners = async (params = {}) => {
  const { data } = await api.get("/exchanges/partners", { params });
  return data.data ?? data;
};

export const createPartner = async (payload) => {
  const { data } = await api.post("/exchanges/partners", payload);
  return data.data;
};

export const createExchange = async (payload) => {
  const { data } = await api.post("/exchanges", payload);
  return data.data;
};

export const fetchAllExchanges = async (params = {}) => {
  const { data } = await api.get("/exchanges", { params });
  return data.data ?? data;
};

export const fetchPendingExchanges = async () => {
  const { data } = await api.get("/exchanges/pending");
  return data.data ?? data;
};

export const fetchExchangeDetail = async (id) => {
  const { data } = await api.get(`/exchanges/${id}`);
  return data.data ?? data;
};

export const approveExchange = async (id) => {
  const { data } = await api.post(`/exchanges/${id}/approve`);
  return data.data;
};

export const rejectExchange = async (id, reason) => {
  const { data } = await api.post(`/exchanges/${id}/reject`, { reason });
  return data.data;
};

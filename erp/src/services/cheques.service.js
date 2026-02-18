import api from "@/api";

export const fetchCheques = async (params = {}) => {
  const { data } = await api.get("/cheques", { params });
  return data.data;
};

export const fetchCheque = async (id) => {
  const { data } = await api.get(`/cheques/${id}`);
  return data.data;
};

export const createCheque = async (payload) => {
  const { data } = await api.post("/cheques", payload);
  return data.data;
};

export const clearCheque = async (id) => {
  const { data } = await api.patch(`/cheques/${id}/clear`);
  return data.data;
};

export const voidCheque = async (id) => {
  const { data } = await api.patch(`/cheques/${id}/void`);
  return data.data;
};

import api from "@/api";

export const fetchJournals = async (params = {}) => {
  const { data } = await api.get("/journals", { params });
  return data.data;
};

export const fetchJournal = async (id) => {
  const { data } = await api.get(`/journals/${id}`);
  return data.data;
};

export const createJournal = async (payload) => {
  const { data } = await api.post("/journals", payload);
  return data.data;
};

export const voidJournal = async (id) => {
  const { data } = await api.post(`/journals/${id}/void`);
  return data.data;
};

import api from "@/api";

export const fetchAccounts = async (params = {}) => {
  const { data } = await api.get("/accounts", { params });
  return data.data;
};

export const fetchAccount = async (id) => {
  const { data } = await api.get(`/accounts/${id}`);
  return data.data;
};

export const createAccount = async (payload) => {
  const { data } = await api.post("/accounts", payload);
  return data.data;
};

export const updateAccount = async (id, payload) => {
  const { data } = await api.put(`/accounts/${id}`, payload);
  return data.data;
};

export const updateAccountStatus = async (id, active) => {
  const { data } = await api.patch(`/accounts/${id}/status`, { active });
  return data.data;
};

export const deleteAccount = async (id) => {
  await api.delete(`/accounts/${id}`);
};

export const fetchAccountLedger = async (id, from, to) => {
  const { data } = await api.get(`/accounts/${id}/ledger`, { params: { from, to } });
  return data.data;
};

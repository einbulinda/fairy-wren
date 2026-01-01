import api from "./api";

export const fetchAccounts = () => api.get("/accounts").then((res) => res.data);

export const createAccounts = (payload) => api.post("/accounts", payload);

export const updateAccount = (accountId, payload) =>
  api.patch(`/accounts/${accountId}`, payload);

export const toggleStatus = (accountId, payload) =>
  api.patch(`/accounts/${accountId}/status`, payload);

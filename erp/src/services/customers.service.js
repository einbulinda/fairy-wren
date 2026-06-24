import api from "@/api";

// ── Accounts ──────────────────────────────────────────────────────────────

export const fetchCustomerAccounts = async (params = {}) => {
  const { data } = await api.get("/customers", { params });
  return data.data ?? data;
};

export const createCustomerAccount = async (payload) => {
  const { data } = await api.post("/customers", payload);
  return data.data ?? data;
};

export const updateCustomerAccount = async ({ id, ...payload }) => {
  const { data } = await api.patch(`/customers/${id}`, payload);
  return data.data ?? data;
};

export const deleteCustomerAccount = async (id) => {
  await api.delete(`/customers/${id}`);
};

export const fetchAccountBills = async (id, params = {}) => {
  const { data } = await api.get(`/customers/${id}/bills`, { params });
  return data.data ?? data;
};

// ── Linking ───────────────────────────────────────────────────────────────

export const linkNameToAccount = async ({ id, name }) => {
  const { data } = await api.post(`/customers/${id}/link`, { name });
  return data.data ?? data;
};

export const unlinkBillFromAccount = async ({ customerId, billId }) => {
  await api.delete(`/customers/${customerId}/bills/${billId}`);
};

// ── Discovery ─────────────────────────────────────────────────────────────

export const fetchUnlinkedNames = async (params = {}) => {
  const { data } = await api.get("/customers/unlinked/names", { params });
  return data.data ?? data;
};

export const fetchUnlinkedBillsForName = async (name) => {
  const { data } = await api.get("/customers/unlinked/bills", { params: { name } });
  return data.data ?? data;
};

export const linkBillsToAccount = async ({ id, billIds }) => {
  const { data } = await api.post(`/customers/${id}/link-bills`, { billIds });
  return data.data ?? data;
};

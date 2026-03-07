import api from "@/api";

export const fetchSuppliers = async (params = {}) => {
  const { data } = await api.get("/suppliers", { params });
  return data.data ?? data;
};

export const fetchSupplier = async (id) => {
  const { data } = await api.get(`/suppliers/${id}`);
  return data.data;
};

export const createSupplier = async (payload) => {
  const { data } = await api.post("/suppliers", payload);
  return data.data;
};

export const updateSupplier = async ({ id, ...payload }) => {
  const { data } = await api.patch(`/suppliers/${id}`, payload);
  return data.data;
};

export const fetchSupplierPurchases = async (id) => {
  const { data } = await api.get(`/suppliers/${id}/purchases`);
  return data.data;
};

export const fetchSupplierPayments = async (id) => {
  const { data } = await api.get(`/suppliers/${id}/payments`);
  return data.data;
};

export const createSupplierPayment = async ({ supplierId, ...payload }) => {
  const { data } = await api.post(`/suppliers/${supplierId}/payments`, payload);
  return data.data;
};

export const fetchPendingInvoices = async () => {
  const { data } = await api.get("/suppliers/pending-invoices");
  return data.data ?? data;
};

export const fetchSupplierStatement = async (id, from, to) => {
  const { data } = await api.get(`/suppliers/${id}/statement`, {
    params: { from: from || undefined, to: to || undefined },
  });
  return data.data;
};
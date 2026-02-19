import api from "@/api";

export const fetchProducts = async (params = {}) => {
  const { data } = await api.get("/products", { params });
  return data.data ?? data;
};

export const fetchProduct = async (id) => {
  const { data } = await api.get(`/products/${id}`);
  return data.data ?? data;
};

export const createProduct = async (payload) => {
  const { data } = await api.post("/products", payload);
  return data.data;
};

export const updateProduct = async ({ id, ...payload }) => {
  const { data } = await api.put(`/products/${id}`, payload);
  return data.data;
};

export const updateProductStatus = async ({ id, status }) => {
  const { data } = await api.patch(`/products/${id}/status`, { status });
  return data.data;
};

export const fetchProductPurchaseHistory = async (id) => {
  const { data } = await api.get(`/products/${id}/purchases`);
  return data.data ?? data;
};

export const fetchProductSalesHistory = async (id) => {
  const { data } = await api.get(`/products/${id}/sales`);
  return data.data ?? data;
};

export const fetchProductInsights = async (id) => {
  const { data } = await api.get(`/products/${id}/insights`);
  return data.data ?? data;
};
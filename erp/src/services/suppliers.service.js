import api from "@/api";

export const fetchSuppliers = async (params = {}) => {
  const { data } = await api.get("/suppliers", { params });
  return data.data ?? data;
};
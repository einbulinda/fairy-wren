import api from "@/api";

export const fetchCategories = async (params = {}) => {
  const { data } = await api.get("/categories", { params });
  return data.data ?? data;
};

export const createCategory = async (payload) => {
  const { data } = await api.post("/categories", payload);
  return data.data;
};

export const updateCategory = async ({ id, ...payload }) => {
  const { data } = await api.patch(`/categories/${id}`, payload);
  return data.data;
};

export const updateCategoryStatus = async ({ id, active }) => {
  const { data } = await api.patch(`/categories/${id}`, { active });
  return data.data;
};

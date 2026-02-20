import api from "@/api";

export const fetchUsers = async () => {
  const { data } = await api.get("/users");
  return data.data ?? data;
};

export const createUser = async (payload) => {
  const { data } = await api.post("/users", payload);
  return data.data ?? data;
};

export const updateUser = async ({ id, ...payload }) => {
  const { data } = await api.put(`/users/${id}`, payload);
  return data.data ?? data;
};

export const toggleUserStatus = async ({ id, active }) => {
  const { data } = await api.patch(`/users/${id}/status`, { status: active });
  return data.data ?? data;
};

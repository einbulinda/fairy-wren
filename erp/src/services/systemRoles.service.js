import api from "@/api";

export const fetchSystemRoles = async () => {
  const { data } = await api.get("/system-roles");
  return data.data;
};

export const createSystemRole = async (payload) => {
  const { data } = await api.post("/system-roles", payload);
  return data.data;
};

export const updateSystemRole = async ({ code, ...payload }) => {
  const { data } = await api.put(`/system-roles/${code}`, payload);
  return data.data;
};

export const deleteSystemRole = async (code) => {
  await api.delete(`/system-roles/${code}`);
};

import api from "@/api";

export const fetchAccountClasses = async () => {
  const { data } = await api.get("/account-classes");
  return data.data;
};

export const createAccountClass = async (payload) => {
  const { data } = await api.post("/account-classes", payload);
  return data.data;
};

export const updateAccountClass = async ({ code, ...payload }) => {
  const { data } = await api.put(`/account-classes/${code}`, payload);
  return data.data;
};

export const deleteAccountClass = async (code) => {
  await api.delete(`/account-classes/${code}`);
};

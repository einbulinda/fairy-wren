import api from "@/api";

export const fetchSettings = async () => {
  const { data } = await api.get("/settings");
  return data.data;
};

export const updateSettings = async (payload) => {
  const { data } = await api.put("/settings", payload);
  return data.data;
};

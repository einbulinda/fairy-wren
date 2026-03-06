import api from "@/api";

export const fetchBills = async (params = {}) => {
  const { data } = await api.get("/bills", { params });
  return data.data;
};

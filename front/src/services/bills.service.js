import api from "./api";

export const fetchOpenBills = async () => {
  try {
    const response = await api.get("/bills/open");
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error fetching open bills." };
  }
};

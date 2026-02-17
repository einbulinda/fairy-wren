import api from "@/api";

export const fetchAccounts = async () => {
  try {
    const response = await api.get("/accounts");
    return response.data.data || response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error fetching accounts." };
  }
};

export const createAccounts = async (payload) => {
  try {
    const response = await api.post("/accounts", payload);
    return response.data.data || response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error creating account." };
  }
};

export const updateAccount = async (accountId, payload) => {
  try {
    const response = await api.put(`/accounts/${accountId}`, payload);
    return response.data.data || response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error updating account." };
  }
};

export const toggleStatus = async (accountId, payload) => {
  try {
    const response = await api.patch(`/accounts/${accountId}/status`, payload);
    return response.data.data || response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error updating account status." };
  }
};

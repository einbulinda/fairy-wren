import api from "@/api";

export async function loginWithPin(pin) {
  try {
    const { data } = await api.post("/auth/login", { pin });
    return data;
  } catch (error) {
    throw error.response?.data || { error: "Login failed" };
  }
}

export const updateProfile = async (payload) => {
  const { data } = await api.patch("/auth/profile", payload);
  return data.data;
};

export const changePin = async (payload) => {
  const { data } = await api.patch("/auth/change-pin", payload);
  return data.data;
};
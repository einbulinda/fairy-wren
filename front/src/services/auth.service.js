import api from "./api";

export async function loginWithPin(pin) {
  try {
    const response = await api.post("/auth/login", { pin });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Login failed" };
  }
}

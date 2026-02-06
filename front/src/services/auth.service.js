import api from "./api";

export async function loginWithPin(pin) {
  try {
    const { data } = await api.post("/auth/login", { pin });
    return data;
  } catch (error) {
    throw error.response?.data || { error: "Login failed" };
  }
}

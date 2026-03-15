import api from "@/api";

export async function loginWithPin(pin) {
  try {
    const { data } = await api.post("/auth/login", { pin, app: "erp" });
    return data;
  } catch (error) {
    throw error.response?.data || { error: "Login failed" };
  }
}

export async function logoutSession(reason = "logout") {
  try {
    await api.post("/auth/logout", { reason });
  } catch {
    // Best-effort — don't block logout if this fails
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
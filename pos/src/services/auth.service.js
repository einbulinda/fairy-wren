import api from "@/api";

export async function loginWithPin(pin) {
  try {
    const { data } = await api.post("/auth/login", { pin, app: "pos" });
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

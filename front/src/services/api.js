import axios from "axios";
import { getAuthToken } from "../context/AuthProvider";

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach a token
api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.clear();
      window.location.replace("/login");
    }

    if (!error.response) {
      error.message = "Network error. Please check connectivity.";
    }

    return Promise.reject(error);
  }
);

export default api;

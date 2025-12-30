import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* Routes that do NOT require auth */
const PUBLIC_ENDPOINTS = ["/auth/login"];

// Attach token
api.interceptors.request.use(
  (config) => {
    const requestUrl = config.url ?? "";

    // Skip auth check for public urls
    if (PUBLIC_ENDPOINTS.some((endpoint) => requestUrl.includes(endpoint))) {
      return config;
    }

    const token = sessionStorage.getItem("token");
    const expiry = sessionStorage.getItem("token_expiry");
    console.log("Token Interceptor Called!!!!!");

    /* No token → block */
    if (!token || !expiry) {
      return config;
    }

    /* Expired token → logout */
    if (Date.now() > Number(expiry)) {
      sessionStorage.clear();
      window.location.href = "/login";
      return Promise.reject(new Error("Session expired"));
    }

    /* Attach token */
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

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

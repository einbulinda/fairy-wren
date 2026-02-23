import { TokenService } from "./token.service";
import { INACTIVITY_TIMEOUT } from "./constants";

const PUBLIC_ENDPOINTS = ["/auth/login"];

export function attachAuthInterceptor(api) {
  api.interceptors.request.use(
    (config) => {
      const url = config.url || "";

      if (PUBLIC_ENDPOINTS.some((p) => url.includes(p))) {
        return config;
      }

      const token = TokenService.getToken();

      if (!token || TokenService.isExpired()) {
        TokenService.clear();
        window.location.replace("/");
        return Promise.reject(new Error("Session expired"));
      }

      TokenService.resetExpiry(INACTIVITY_TIMEOUT);
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error),
  );
}

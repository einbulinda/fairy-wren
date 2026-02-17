import { TokenService } from "./token.service";

export function attachErrorInterceptor(api) {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;

      if (status === 401) {
        TokenService.clear();
        window.location.replace("/");
      }

      if (!error.response) {
        error.message = "Network error. Please check connectivity.";
      }

      return Promise.reject(error);
    },
  );
}
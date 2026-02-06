import { apiClient } from "./client";
import { attachAuthInterceptor } from "./auth.interceptor";
import { attachErrorInterceptor } from "./error.interceptor";

attachAuthInterceptor(apiClient);
attachErrorInterceptor(apiClient);

export default apiClient;

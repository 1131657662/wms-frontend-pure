import type { AxiosInstance } from "axios";
import { getToken } from "@/utils/auth";
import { message } from "@/utils/message";
import { parseBackendErrorMessage } from "@/utils/apiErrorMessage";

let wms401Handling = false;

/**
 * WMS 业务 axios 实例的公共拦截器（与 PureHttp 分离，避免与 api/user 循环依赖）
 */
export function applyWmsApiInterceptors(api: AxiosInstance): void {
  api.interceptors.request.use(config => {
    const token = getToken()?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    response => response.data,
    error => {
      const msg = parseBackendErrorMessage(error);
      message(msg, { type: "error" });
      if (error.response?.status === 401 && !wms401Handling) {
        wms401Handling = true;
        void import("@/store/modules/user")
          .then(({ useUserStoreHook }) => {
            try {
              useUserStoreHook().logOut();
            } finally {
              wms401Handling = false;
            }
          })
          .catch(() => {
            wms401Handling = false;
            void import("@/utils/auth").then(({ removeToken }) => {
              removeToken();
              const historyMode = (
                import.meta.env.VITE_ROUTER_HISTORY || "hash"
              ).replace(/"/g, "");
              const base = (import.meta.env.BASE_URL || "/").replace(
                /\/+$/,
                ""
              );
              const loginUrl = historyMode.startsWith("hash")
                ? `${window.location.origin}${base ? `${base}/` : "/"}#/login`
                : `${window.location.origin}${base ? `${base}/` : "/"}login`;
              window.location.href = loginUrl;
            });
          });
      }
      return Promise.reject(error);
    }
  );
}

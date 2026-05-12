import axios from "axios";
import { getToken } from "@/utils/auth";
import { message } from "@/utils/message";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000
});

/** 防止并发 401 多次触发登出（与 api/user 通过动态 import 避免循环依赖） */
let wms401Handling = false;

// 请求拦截器：自动添加 token
api.interceptors.request.use(config => {
  const token = getToken()?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  response => response.data,
  error => {
    const body = error.response?.data;
    const msg =
      (body && typeof body === "object" && "message" in body && body.message) ||
      (typeof body === "string" ? body : "") ||
      "网络错误";
    message(String(msg), { type: "error" });
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
            const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
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

export default api;

import axios from "axios";
import { getToken } from "@/utils/auth";
import { message } from "@/utils/message";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000
});

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
    const msg = error.response?.data?.message || "网络错误";
    message(msg, { type: "error" });
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

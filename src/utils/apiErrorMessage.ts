import type { AxiosError } from "axios";

/**
 * 从 WMS 后端 JSON（{ code, message }）或纯文本响应体解析错误提示，
 * 供 WMS axios 与后续需对齐 PureHttp 的调用点复用。
 */
export function parseBackendErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "网络错误";
  const ax = error as AxiosError<{ message?: string } | string>;
  const data = ax.response?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    data.message != null &&
    String(data.message).trim() !== ""
  ) {
    return String(data.message);
  }
  const m = ax.message;
  if (typeof m === "string" && m && m !== "Network Error") return m;
  return "网络错误";
}

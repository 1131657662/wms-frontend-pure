/**
 * 统一格式化工具 — 消除各页面重复代码
 *
 * 使用方式：
 *   import { formatTime, formatDate, formatBoolean, formatDict, formatNull } from "@/utils/format";
 */

/** 日期时间格式化（含时分秒）— 适用于 create_time、audit_time 等完整时间戳 */
export function formatTime(t: string | null | undefined): string {
  if (!t) return "—";
  // 纯日期字符串 (YYYY-MM-DD) 避免 UTC+8 偏移
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return new Date(t).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).replace(/\//g, "-");
}

/** 日期格式化（仅日期，无时分秒）— 适用于 inbound_date、outbound_date */
export function formatDate(t: string | null | undefined): string {
  if (!t) return "—";
  const d = new Date(t);
  if (isNaN(d.getTime())) return String(t);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

/** 布尔值 → 中文 */
export function formatBoolean(
  v: number | boolean | null | undefined,
  trueLabel = "是",
  falseLabel = "否"
): string {
  if (v === null || v === undefined) return "—";
  return v ? trueLabel : falseLabel;
}

/** 启用状态 → 中文（formatBoolean 的语义别名） */
export function formatEnabled(
  v: number | boolean | null | undefined
): string {
  return formatBoolean(v, "启用", "禁用");
}

/** 通用字典映射 — 从 { dict_value: dict_label } 的 map 中查找 */
export function formatDict(
  map: Record<string | number, string>,
  value: string | number | null | undefined,
  fallback = "—"
): string {
  if (value === null || value === undefined || value === "") return fallback;
  const label = map[value];
  return label !== undefined && label !== "" ? label : String(value);
}

/** 空值占位 */
export function formatNull(
  v: unknown,
  placeholder = "—"
): string {
  if (v === null || v === undefined || v === "" || (typeof v === "number" && isNaN(v)))
    return placeholder;
  return String(v);
}

/** 数字精度格式化（4 位小数 — UI 规范吨位精度） */
export function formatWeight(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(4);
}

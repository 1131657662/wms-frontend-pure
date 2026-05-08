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
  return new Date(t)
    .toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
    .replace(/\//g, "-");
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
export function formatEnabled(v: number | boolean | null | undefined): string {
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
export function formatNull(v: unknown, placeholder = "—"): string {
  if (
    v === null ||
    v === undefined ||
    v === "" ||
    (typeof v === "number" && isNaN(v))
  )
    return placeholder;
  return String(v);
}

/** 数字精度格式化（4 位小数 — UI 规范吨位精度） */
export function formatWeight(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(4);
}

// ===================================================================
// 状态常量映射 — 对照后端 config/constants.js STATUS_LABEL，字典 API 失败时的可靠回退
// ===================================================================

/** 订单状态 → 中文（入库单/出库单通用） */
export const ORDER_STATUS_MAP: Record<string, string> = {
  draft: "草稿",
  submit: "已提交",
  audited: "已审核",
  cancelled: "已取消",
  completed: "已完成"
};

/** 订单状态 → el-tag type */
export const ORDER_STATUS_TYPE: Record<string, string> = {
  draft: "info",
  submit: "warning",
  audited: "success",
  cancelled: "danger",
  completed: "success"
};

/** 盘点状态 → 中文 */
export const CHECK_STATUS_MAP: Record<string, string> = {
  draft: "草稿",
  confirmed: "已确认",
  adjusted: "已调整",
  voided: "已作废"
};

/** 盘点状态 → el-tag type */
export const CHECK_STATUS_TYPE: Record<string, string> = {
  draft: "info",
  confirmed: "success",
  adjusted: "warning",
  voided: "danger"
};

/** 车辆状态 → 中文 */
export const VEHICLE_STATUS_MAP: Record<number, string> = {
  0: "维修",
  1: "可用",
  2: "停用"
};

/** 车辆状态 → el-tag type */
export const VEHICLE_STATUS_TYPE: Record<number, string> = {
  0: "danger",
  1: "success",
  2: "info"
};

// ===================================================================
// 状态格式化函数 — 统一返回 { label, type }，供 <el-tag> 直接使用
// ===================================================================

export interface StatusResult {
  label: string;
  type: "success" | "warning" | "danger" | "info" | "";
}

function toStatusResult(
  value: string | number | null | undefined,
  labelMap: Record<string | number, string>,
  typeMap: Record<string | number, string>
): StatusResult {
  if (value === null || value === undefined) {
    return { label: "—", type: "info" };
  }
  const label = labelMap[value];
  const type = (typeMap[value] || "info") as StatusResult["type"];
  return { label: label || String(value), type };
}

/** 订单状态格式化 */
export function formatOrderStatus(v: string | null | undefined): StatusResult {
  return toStatusResult(v, ORDER_STATUS_MAP, ORDER_STATUS_TYPE);
}

/** 盘点状态格式化 */
export function formatCheckStatus(v: string | null | undefined): StatusResult {
  return toStatusResult(v, CHECK_STATUS_MAP, CHECK_STATUS_TYPE);
}

/** 车辆状态格式化 */
export function formatVehicleStatus(
  v: number | null | undefined
): StatusResult {
  return toStatusResult(v, VEHICLE_STATUS_MAP, VEHICLE_STATUS_TYPE);
}

// ===================================================================
// 业务类型 / 单据类型映射 — 仪表盘 DocTable & ActivityTimeline
// ===================================================================

/** 单据类型 → 中文（最近业务单据） */
export const DOC_TYPE_MAP: Record<string, string> = {
  inbound: "入库单",
  outbound: "出库单",
  check: "盘点单"
};

/** 单据类型 → el-tag type */
export const DOC_TYPE_TAG: Record<string, string> = {
  inbound: "primary",
  outbound: "success",
  check: "warning"
};

/** 业务类型 → 中文（操作日志/动态） */
export const BUSINESS_TYPE_MAP: Record<string, string> = {
  inbound: "入库",
  outbound: "出库",
  stock: "库存",
  stock_check: "盘点",
  product: "商品",
  product_category: "商品分类",
  warehouse: "仓库",
  customer: "客户",
  supplier: "供应商",
  vehicle: "车辆",
  user: "用户",
  role: "角色"
};

/** 单据类型格式化 */
export function formatDocType(v: string | null | undefined): StatusResult {
  return toStatusResult(v, DOC_TYPE_MAP, DOC_TYPE_TAG);
}

// ===================================================================
// 消息类型映射 — 对照后端消息发送支持的四种类型
// ===================================================================

/** 消息类型 → 中文 */
export const MESSAGE_TYPE_MAP: Record<string, string> = {
  announcement: "系统公告",
  alert_low: "低库存预警",
  alert_high: "高库存预警",
  alert_zero: "零库存预警"
};

/** 消息类型 → el-tag type */
export const MESSAGE_TYPE_TAG: Record<string, string> = {
  announcement: "primary",
  alert_low: "danger",
  alert_high: "warning",
  alert_zero: "info"
};

/** 消息类型格式化 */
export function formatMessageType(v: string | null | undefined): StatusResult {
  return toStatusResult(v, MESSAGE_TYPE_MAP, MESSAGE_TYPE_TAG);
}

/** 业务类型格式化（无 tag type 映射，统一用 info） */
export function formatBusinessType(v: string | null | undefined): string {
  if (!v) return "—";
  return BUSINESS_TYPE_MAP[v] || v;
}

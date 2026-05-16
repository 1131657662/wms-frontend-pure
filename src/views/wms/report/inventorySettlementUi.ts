import type { SettlementRow } from "./inventorySettlementTypes";

export type RowTypeKey = "opening" | "inbound" | "outbound";

export type RowTypeMeta = {
  label: string;
  tagType: "info" | "success" | "warning";
  tagEffect: "light" | "dark" | "plain";
  rowClass: string;
};

export function rowTypeMeta(rowType?: string): RowTypeMeta {
  switch (rowType as RowTypeKey) {
    case "opening":
      return {
        label: "期初",
        tagType: "info",
        tagEffect: "light",
        rowClass: "settlement-row-opening"
      };
    case "inbound":
      return {
        label: "进仓",
        tagType: "success",
        tagEffect: "dark",
        rowClass: "settlement-row-inbound"
      };
    case "outbound":
      return {
        label: "出仓",
        tagType: "warning",
        tagEffect: "dark",
        rowClass: "settlement-row-outbound"
      };
    default:
      return {
        label: "—",
        tagType: "info",
        tagEffect: "plain",
        rowClass: ""
      };
  }
}

export function formatWeight(v?: number) {
  return Number(v || 0).toFixed(4);
}

export function formatQty(v?: number) {
  const n = Number(v || 0);
  if (!n) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function formatSummaryQty(v?: number) {
  const n = Number(v || 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export type MetricTone = "zero" | "in" | "out" | "balance" | "open";

export function metricTone(
  field: "in" | "out" | "balance" | "open",
  value?: number
): MetricTone {
  const n = Number(value || 0);
  if (!n) return "zero";
  if (field === "in") return "in";
  if (field === "out") return "out";
  if (field === "balance") return "balance";
  return "open";
}

export function metricClass(tone: MetricTone) {
  return `settlement-metric settlement-metric--${tone}`;
}

export function rowClassName({ row }: { row: SettlementRow }) {
  return rowTypeMeta(row.row_type).rowClass;
}

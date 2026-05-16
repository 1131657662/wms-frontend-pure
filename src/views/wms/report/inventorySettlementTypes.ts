export type SettlementRow = {
  group_key?: string;
  group_rowspan?: number;
  product_code?: string;
  product_name?: string;
  product_model?: string;
  biz_date?: string;
  biz_date_label?: string;
  row_type?: string;
  row_type_label?: string;
  open_qty?: number;
  open_weight?: number;
  in_qty?: number;
  in_weight?: number;
  out_qty?: number;
  out_weight?: number;
  balance_qty?: number;
  balance_weight?: number;
  storage_days?: number | null;
};

export type GroupSubtotal = {
  in_qty: number;
  in_weight: number;
  out_qty: number;
  out_weight: number;
  balance_qty: number;
  balance_weight: number;
};

export type ProductGroup = {
  group_key: string;
  product_code?: string;
  product_name?: string;
  product_model?: string;
  product_desc?: string;
  rows: SettlementRow[];
  subtotal: GroupSubtotal;
};

export type NameSummaryRow = {
  product_name: string;
  in_qty: number;
  in_weight: number;
  out_qty: number;
  out_weight: number;
  balance_qty: number;
  balance_weight: number;
  sku_count?: number;
  _isTotal?: boolean;
};

export type WarehouseNameSummary = {
  rows: NameSummaryRow[];
  total: NameSummaryRow;
};

export type WarehouseTab = {
  warehouse_code: string;
  warehouse_name: string;
  list: SettlementRow[];
  groups: ProductGroup[];
  total: number;
  nameSummary?: WarehouseNameSummary;
  nameOptions?: string[];
};

export type ProductOption = {
  value: string;
  label: string;
  product_code?: string;
};

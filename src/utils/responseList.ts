/**
 * 统一解析接口返回：裸数组或 `{ list: T[] }`（可选 `total`）；兼容历史 `{ rows }`。
 */
export function responseList<T = Record<string, unknown>>(data: unknown): T[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === "object") {
    const o = data as { list?: unknown; rows?: unknown };
    if (Array.isArray(o.list)) return o.list as T[];
    if (Array.isArray(o.rows)) return o.rows as T[];
  }
  return [];
}

/** 分页等场景：从 `{ total }` 取条数，缺省或非数字时为 0。 */
export function responseTotal(data: unknown): number {
  if (data == null || typeof data !== "object") return 0;
  const t = (data as { total?: unknown }).total;
  if (t == null || t === "") return 0;
  const n = typeof t === "number" ? t : Number(t);
  return Number.isFinite(n) ? n : 0;
}

/** 数据字典 `/sys/dict/data/*` 列表行：在保留原字段基础上规范 `dict_value` / `dict_label`。 */
export type DictDataRow = Record<string, unknown> & {
  dict_value: string;
  dict_label: string;
  remark?: string;
};

export function responseDictList(data: unknown): DictDataRow[] {
  return responseList<Record<string, unknown>>(data).map(row => {
    const r = row.remark;
    const out: DictDataRow = {
      ...row,
      dict_value: String(row.dict_value ?? ""),
      dict_label: String(row.dict_label ?? "")
    };
    out.remark = r == null || r === "" ? undefined : String(r);
    return out;
  });
}

/** el-option / 小程序 picker：`{ label, value }[]` */
export type DictOption = { label: string; value: string };

export function dictDataToOptions(rows: DictDataRow[]): DictOption[] {
  return rows.map(d => ({ label: d.dict_label, value: d.dict_value }));
}

/** 从接口 `data` 直接得到字典下拉项（内部一次 `responseDictList`）。 */
export function responseDictOptions(data: unknown): DictOption[] {
  return dictDataToOptions(responseDictList(data));
}

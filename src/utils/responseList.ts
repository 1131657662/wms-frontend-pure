/**
 * 统一解析接口返回：裸数组或 `{ list: T[] }`（可选 `total`）。
 */
export function responseList<T = Record<string, unknown>>(data: unknown): T[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as T[];
  if (
    typeof data === "object" &&
    Array.isArray((data as { list?: unknown }).list)
  ) {
    return (data as { list: T[] }).list;
  }
  return [];
}

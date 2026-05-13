import api from "@/api/wms";
import { responseList, responseTotal } from "@/utils/responseList";

/** 下拉、全量主数据等：单页条数（减少浏览器一次解析过大 JSON） */
export const LIST_PAGE_CHUNK_DEFAULT = 500;

/** 浏览器端全量导出等：单页条数（与后端 API_MAX_PAGE_SIZE 兼容，由调用方显式传入） */
export const EXPORT_PAGE_CHUNK = 5000;

const MAX_PAGES = 500;

type ListPayload = { list?: unknown[]; total?: number };

/**
 * 分页拉取列表直到拿全（下拉、导出等）。
 * 默认 `pageSize` 为 {@link LIST_PAGE_CHUNK_DEFAULT}；导出请传入 {@link EXPORT_PAGE_CHUNK} 等。
 */
export async function fetchAllListPages<T = Record<string, unknown>>(
  url: string,
  baseParams: Record<string, unknown> = {},
  pageSize = LIST_PAGE_CHUNK_DEFAULT
): Promise<T[]> {
  const all: T[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await api.get(url, {
      params: { ...baseParams, page, pageSize }
    });
    const data = res.data as ListPayload;
    const chunk = responseList(data) as T[];
    all.push(...chunk);
    const total = responseTotal(data);
    if (chunk.length === 0) break;
    if (total > 0 && all.length >= total) break;
    if (chunk.length < pageSize) break;
  }

  return all;
}

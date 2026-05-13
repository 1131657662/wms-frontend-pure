import api from "@/api/wms";

const DEFAULT_PAGE_SIZE = 5000;
const MAX_PAGES = 500;

type ListPayload = { list?: any[]; total?: number };

/**
 * 分页拉取列表直到拿全（浏览器端导出等场景）。
 * 依赖后端 `data.list` + `data.total`；单页条数默认 5000，与后端 WMS_BULK_LIST_MAX 默认兼容。
 */
export async function fetchAllListPages(
  url: string,
  baseParams: Record<string, unknown> = {},
  pageSize = DEFAULT_PAGE_SIZE
): Promise<any[]> {
  const all: any[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await api.get(url, {
      params: { ...baseParams, page, pageSize }
    });
    const data = res.data as ListPayload;
    const chunk = data?.list ?? [];
    all.push(...chunk);
    const total = Number(data?.total ?? 0);
    if (chunk.length === 0) break;
    if (total > 0 && all.length >= total) break;
    if (chunk.length < pageSize) break;
  }

  return all;
}

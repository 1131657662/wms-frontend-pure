import { constantMenus } from "@/router";

const STORAGE_KEY = "wms-menu-order";

interface SortItem {
  menu_code: string;
  sort_order: number;
}

export function saveMenuOrderToStorage(items: SortItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getMenuOrderMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const map: Record<string, number> = {};
    JSON.parse(raw).forEach((item: SortItem) => {
      map[item.menu_code] = item.sort_order;
    });
    return map;
  } catch {
    return {};
  }
}

/** 将路由 path 映射到 orderMap 中的 key */
function findOrder(path: string, orderMap: Record<string, number>): number | undefined {
  const clean = path.replace(/\/:[\w]+$/, "");
  // 1. 精确匹配（子级路由如 /auth/user）
  if (orderMap[clean] !== undefined) return orderMap[clean];
  // 2. 去掉开头 / 匹配（顶级路由如 dashboard、inbound）
  const name = clean.replace(/^\//, "");
  if (orderMap[name] !== undefined) return orderMap[name];
  return undefined;
}

/** 将 localStorage 中保存的排序应用到路由 meta.rank 和 children 顺序 */
export function applyMenuOrderToRoutes(): void {
  const orderMap = getMenuOrderMap();
  if (Object.keys(orderMap).length === 0) return;

  // 1. 修改顶级路由的 meta.rank
  for (const route of constantMenus) {
    const rank = findOrder(route.path, orderMap);
    if (rank !== undefined) {
      route.meta.rank = rank;
    }
  }

  // 2. 对每个顶级路由，重排其 children 数组
  for (const route of constantMenus) {
    if (!route.children || route.children.length <= 1) continue;
    route.children.sort((a: any, b: any) => {
      const aOrder = findOrder(a.path, orderMap) ?? 999;
      const bOrder = findOrder(b.path, orderMap) ?? 999;
      return aOrder - bOrder;
    });
  }
}

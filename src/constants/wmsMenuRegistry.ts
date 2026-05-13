/**
 * 菜单展示文案注册表：与 `router/modules/wms.ts` 中 path / 顶级 name 对齐，
 * 供「菜单排序」页与后端 `sys_menu_sort.menu_code` 解析共用，减少双写漂移。
 * 新增路由时请同步此处与 wms.ts。
 */
export type WmsMenuLabelDef = { label: string };

export const WMS_MENU_LABEL_DEFS: Record<string, WmsMenuLabelDef> = {
  dashboard: { label: "首页" },
  "/dashboard/analysis": { label: "分析页" },
  "/dashboard/workplace": { label: "工作台" },
  report: { label: "统计报表" },
  "/report/monthly-summary": { label: "月度出入库汇总" },
  "/report/turnover": { label: "商品周转率统计" },
  "/report/inbound-detail": { label: "入库明细报表" },
  "/report/outbound-detail": { label: "出库明细报表" },
  "/report/stock-journal": { label: "进销存台账" },
  "/report/period-summary": { label: "收发存汇总表" },
  "/report/stock-aging": { label: "库龄分析报表" },
  base: { label: "基础资料" },
  "/product-category": { label: "商品分类" },
  "/product": { label: "商品管理" },
  "/warehouse": { label: "仓库管理" },
  "/supplier": { label: "供应商管理" },
  "/customer": { label: "客户管理" },
  "/vehicle": { label: "车辆管理" },
  inbound: { label: "入库管理" },
  "/inbound/list": { label: "入库单列表" },
  outbound: { label: "出库管理" },
  "/outbound/list": { label: "出库单列表" },
  "stock-check": { label: "盘点管理" },
  "/stock-check/list": { label: "盘点单列表" },
  stock: { label: "库存管理" },
  "/stock/list": { label: "库存查询" },
  auth: { label: "权限管理" },
  "/auth/user": { label: "用户管理" },
  "/auth/role": { label: "角色管理" },
  "/auth/menu-sort": { label: "菜单排序" },
  settings: { label: "系统配置" },
  "/settings/dict": { label: "数据字典" },
  "/settings/param": { label: "系统参数" },
  "/settings/bill": { label: "单据编号配置" },
  "/settings/print": { label: "打印设置" },
  "/settings/backup": { label: "数据备份" },
  monitor: { label: "系统监控" },
  "/monitor/log": { label: "日志管理" },
  "/monitor/online": { label: "在线用户" },
  "/monitor/task": { label: "定时任务" },
  "/monitor/health": { label: "健康监控" },
  message: { label: "消息中心" },
  "/message/center": { label: "消息列表" }
};

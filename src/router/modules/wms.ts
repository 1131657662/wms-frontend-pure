const Layout = () => import("@/layout/index.vue");

/** 侧栏菜单文案与排序 key 见 `src/constants/wmsMenuRegistry.ts`（与后端 sys_menu_sort 对齐） */
export default [
  // ==================== Dashboard ====================
  {
    path: "/dashboard",
    name: "Dashboard",
    component: Layout,
    redirect: "/dashboard/analysis",
    meta: {
      icon: "ep/data-analysis",
      title: "首页",
      rank: 1
    },
    children: [
      {
        path: "/dashboard/analysis",
        name: "DashboardAnalysis",
        component: () => import("@/views/wms/dashboard/Analysis.vue"),
        meta: { title: "分析页" }
      },
      {
        path: "/dashboard/workplace",
        name: "DashboardWorkplace",
        component: () => import("@/views/wms/dashboard/Workplace.vue"),
        meta: { title: "工作台" }
      }
    ]
  },
  // ==================== 统计报表 ====================
  {
    path: "/report",
    name: "Report",
    component: Layout,
    redirect: "/report/monthly-summary",
    meta: {
      icon: "ep/trend-charts",
      title: "统计报表",
      rank: 2,
      perm: "report"
    },
    children: [
      {
        path: "/report/monthly-summary",
        name: "MonthlySummary",
        component: () => import("@/views/wms/report/MonthlySummary.vue"),
        meta: { title: "月度出入库汇总" }
      },
      {
        path: "/report/turnover",
        name: "Turnover",
        component: () => import("@/views/wms/report/Turnover.vue"),
        meta: { title: "商品周转率统计" }
      },
      {
        path: "/report/inbound-detail",
        name: "InboundDetail",
        component: () => import("@/views/wms/report/InboundDetail.vue"),
        meta: { title: "入库明细报表" }
      },
      {
        path: "/report/outbound-detail",
        name: "OutboundDetail",
        component: () => import("@/views/wms/report/OutboundDetail.vue"),
        meta: { title: "出库明细报表" }
      },
      {
        path: "/report/stock-journal",
        name: "StockJournal",
        component: () => import("@/views/wms/report/StockJournal.vue"),
        meta: { title: "进销存台账" }
      },
      {
        path: "/report/period-summary",
        name: "PeriodSummary",
        component: () => import("@/views/wms/report/PeriodSummary.vue"),
        meta: { title: "收发存汇总表" }
      },
      {
        path: "/report/stock-aging",
        name: "StockAging",
        component: () => import("@/views/wms/report/StockAging.vue"),
        meta: { title: "库龄分析报表" }
      },
      {
        path: "/report/inventory-settlement",
        name: "InventorySettlement",
        component: () => import("@/views/wms/report/InventorySettlement.vue"),
        meta: { title: "库存结算对账单" }
      }
    ]
  },
  // ==================== 基础资料 ====================
  {
    path: "/base",
    name: "BaseData",
    component: Layout,
    redirect: "/base/product-category",
    meta: {
      icon: "ri/database-2-line",
      title: "基础资料",
      rank: 3,
      perm: "basic"
    },
    children: [
      {
        path: "/base/product-category",
        name: "ProductCategory",
        component: () => import("@/views/wms/ProductCategory.vue"),
        meta: { title: "商品分类" }
      },
      {
        path: "/base/product",
        name: "Product",
        component: () => import("@/views/wms/Product.vue"),
        meta: { title: "商品管理" }
      },
      {
        path: "/base/warehouse",
        name: "Warehouse",
        component: () => import("@/views/wms/Warehouse.vue"),
        meta: { title: "仓库管理" }
      },
      {
        path: "/base/supplier",
        name: "Supplier",
        component: () => import("@/views/wms/Supplier.vue"),
        meta: { title: "供应商管理" }
      },
      {
        path: "/base/customer",
        name: "Customer",
        component: () => import("@/views/wms/Customer.vue"),
        meta: { title: "客户管理" }
      },
      {
        path: "/base/vehicle",
        name: "Vehicle",
        component: () => import("@/views/wms/Vehicle.vue"),
        meta: { title: "车辆管理" }
      }
    ]
  },
  // ==================== 入库管理 ====================
  {
    path: "/inbound",
    name: "Inbound",
    component: Layout,
    redirect: "/inbound/list",
    meta: {
      icon: "ri/arrow-down-circle-line",
      title: "入库管理",
      rank: 4,
      perm: "inbound",
      useParentTitle: true
    },
    children: [
      {
        path: "/inbound/list",
        name: "InboundOrderList",
        component: () => import("@/views/wms/InboundOrderList.vue"),
        meta: { title: "入库单列表" }
      },
      {
        path: "/inbound/form",
        name: "InboundOrderFormNew",
        component: () => import("@/views/wms/InboundOrderForm.vue"),
        meta: {
          title: "新建入库单",
          showLink: false,
          activeMenu: "/inbound/list"
        }
      },
      {
        path: "/inbound/form/:id",
        name: "InboundOrderFormEdit",
        component: () => import("@/views/wms/InboundOrderForm.vue"),
        meta: {
          title: "编辑入库单",
          showLink: false,
          activeMenu: "/inbound/list"
        }
      },
      {
        path: "/inbound/detail/:id",
        name: "InboundOrderDetail",
        component: () => import("@/views/wms/InboundOrderDetail.vue"),
        meta: {
          title: "入库单详情",
          showLink: false,
          activeMenu: "/inbound/list"
        }
      }
    ]
  },
  // ==================== 出库管理 ====================
  {
    path: "/outbound",
    name: "Outbound",
    component: Layout,
    redirect: "/outbound/list",
    meta: {
      icon: "ri/arrow-up-circle-line",
      title: "出库管理",
      rank: 5,
      perm: "outbound",
      useParentTitle: true
    },
    children: [
      {
        path: "/outbound/list",
        name: "OutboundOrderList",
        component: () => import("@/views/wms/OutboundOrderList.vue"),
        meta: { title: "出库单列表" }
      },
      {
        path: "/outbound/form",
        name: "OutboundOrderFormNew",
        component: () => import("@/views/wms/OutboundOrderForm.vue"),
        meta: {
          title: "新建出库单",
          showLink: false,
          activeMenu: "/outbound/list"
        }
      },
      {
        path: "/outbound/form/:id",
        name: "OutboundOrderFormEdit",
        component: () => import("@/views/wms/OutboundOrderForm.vue"),
        meta: {
          title: "编辑出库单",
          showLink: false,
          activeMenu: "/outbound/list"
        }
      },
      {
        path: "/outbound/detail/:id",
        name: "OutboundOrderDetail",
        component: () => import("@/views/wms/OutboundOrderDetail.vue"),
        meta: {
          title: "出库单详情",
          showLink: false,
          activeMenu: "/outbound/list"
        }
      }
    ]
  },
  // ==================== 盘点管理 ====================
  {
    path: "/stock-check",
    name: "StockCheck",
    component: Layout,
    redirect: "/stock-check/list",
    meta: {
      icon: "ep/checked",
      title: "盘点管理",
      rank: 6,
      perm: "stock-check",
      useParentTitle: true
    },
    children: [
      {
        path: "/stock-check/list",
        name: "StockCheckOrderList",
        component: () => import("@/views/wms/StockCheckOrderList.vue"),
        meta: { title: "盘点单列表" }
      },
      {
        path: "/stock-check/form",
        name: "StockCheckOrderFormNew",
        component: () => import("@/views/wms/StockCheckOrderForm.vue"),
        meta: {
          title: "新建盘点单",
          showLink: false,
          activeMenu: "/stock-check/list"
        }
      },
      {
        path: "/stock-check/form/:id",
        name: "StockCheckOrderFormEdit",
        component: () => import("@/views/wms/StockCheckOrderForm.vue"),
        meta: {
          title: "编辑盘点单",
          showLink: false,
          activeMenu: "/stock-check/list"
        }
      },
      {
        path: "/stock-check/detail/:id",
        name: "StockCheckOrderDetail",
        component: () => import("@/views/wms/StockCheckOrderDetail.vue"),
        meta: {
          title: "盘点单详情",
          showLink: false,
          activeMenu: "/stock-check/list"
        }
      }
    ]
  },
  // ==================== 库存管理 ====================
  {
    path: "/stock",
    name: "Stock",
    component: Layout,
    redirect: "/stock/list",
    meta: {
      icon: "ep/box",
      title: "库存管理",
      rank: 7,
      perm: "stock",
      useParentTitle: true
    },
    children: [
      {
        path: "/stock/list",
        name: "StockList",
        component: () => import("@/views/wms/StockList.vue"),
        meta: { title: "库存查询" }
      }
    ]
  },
  // ==================== 权限管理 ====================
  {
    path: "/auth",
    name: "Auth",
    component: Layout,
    redirect: "/auth/user",
    meta: {
      icon: "ep/lock",
      title: "权限管理",
      rank: 8
    },
    children: [
      {
        path: "/auth/user",
        name: "UserList",
        component: () => import("@/views/wms/UserList.vue"),
        meta: { title: "用户管理", roles: ["ADMIN"] }
      },
      {
        path: "/auth/role",
        name: "RoleList",
        component: () => import("@/views/wms/RoleList.vue"),
        meta: { title: "角色管理", roles: ["ADMIN"] }
      },
      {
        path: "/auth/menu-sort",
        name: "MenuSort",
        component: () => import("@/views/wms/MenuSort.vue"),
        meta: { title: "菜单排序", roles: ["ADMIN"] }
      }
    ]
  },
  // ==================== 系统配置 ====================
  {
    path: "/settings",
    name: "Settings",
    component: Layout,
    redirect: "/settings/dict",
    meta: {
      icon: "ri/settings-3-line",
      title: "系统配置",
      rank: 9,
      perm: "settings"
    },
    children: [
      {
        path: "/settings/dict",
        name: "SysDict",
        component: () => import("@/views/wms/SysDict.vue"),
        meta: { title: "数据字典" }
      },
      {
        path: "/settings/param",
        name: "SysConfig",
        component: () => import("@/views/wms/SysConfig.vue"),
        meta: { title: "系统参数", roles: ["ADMIN"] }
      },
      {
        path: "/settings/bill",
        name: "BillConfig",
        component: () => import("@/views/wms/BillConfig.vue"),
        meta: { title: "单据编号配置", roles: ["ADMIN"] }
      },
      {
        path: "/settings/print",
        name: "PrintConfig",
        component: () => import("@/views/wms/PrintConfig.vue"),
        meta: { title: "打印设置", roles: ["ADMIN"] }
      },
      {
        path: "/settings/backup",
        name: "DataBackup",
        component: () => import("@/views/wms/DataBackup.vue"),
        meta: { title: "数据备份", roles: ["ADMIN"] }
      }
    ]
  },
  // ==================== 系统监控 ====================
  {
    path: "/monitor",
    name: "Monitor",
    component: Layout,
    redirect: "/monitor/log",
    meta: {
      icon: "ep/monitor",
      title: "系统监控",
      rank: 10,
      perm: "monitor"
    },
    children: [
      {
        path: "/monitor/log",
        name: "SysLog",
        component: () => import("@/views/wms/SysLog.vue"),
        meta: { title: "日志管理" }
      },
      {
        path: "/monitor/online",
        name: "OnlineUser",
        component: () => import("@/views/wms/OnlineUser.vue"),
        meta: { title: "在线用户", roles: ["ADMIN"] }
      },
      {
        path: "/monitor/task",
        name: "ScheduledTask",
        component: () => import("@/views/wms/ScheduledTask.vue"),
        meta: { title: "定时任务", roles: ["ADMIN"] }
      },
      {
        path: "/monitor/health",
        name: "HealthMonitor",
        component: () => import("@/views/wms/HealthMonitor.vue"),
        meta: { title: "健康监控", roles: ["ADMIN"] }
      }
    ]
  },
  // ==================== 消息中心 ====================
  {
    path: "/message",
    name: "MessageCenter",
    component: Layout,
    redirect: "/message/center",
    meta: {
      icon: "ep/bell",
      title: "消息中心",
      rank: 11,
      useParentTitle: true
    },
    children: [
      {
        path: "/message/center",
        name: "MessageCenterView",
        component: () => import("@/views/wms/MessageCenter.vue"),
        meta: { title: "消息列表" }
      }
    ]
  },
  // ==================== 个人中心（隐藏） ====================
  {
    path: "/personal",
    name: "Personal",
    component: Layout,
    redirect: "/personal/center",
    meta: {
      title: "个人中心",
      showLink: false
    },
    children: [
      {
        path: "/personal/center",
        name: "PersonalCenter",
        component: () => import("@/views/wms/PersonalCenter.vue"),
        meta: { title: "个人中心", showLink: false }
      }
    ]
  }
];

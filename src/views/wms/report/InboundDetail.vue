<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import Calendar from "~icons/ri/calendar-2-line";
import OfficeBuilding from "~icons/ep/office-building";
import Search from "~icons/ep/search";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";
import Filter from "~icons/ep/filter";
import Box from "~icons/ep/box";

defineOptions({ name: "InboundDetail" });

const list = ref<any[]>([]);
const loading = ref(false);
const exporting = ref(false);
const warehouses = ref<any[]>([]);
const suppliers = ref<any[]>([]);
const supplierOptions = ref<any[]>([]);
const productOptions = ref<any[]>([]);
const vehicleOptions = ref<any[]>([]);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-InboundDetail")) || 20,
  currentPage: 1,
  background: true,
  pageSizes: [10, 20, 50, 100, 200, 500, 1000]
});

const quickFilter = reactive({
  startDate: "",
  endDate: "",
  warehouse_code: "",
  order_status: "",
  keyword: ""
});

const drawerVisible = ref(false);
const drawerFilter = reactive({
  order_no: "",
  dateRange: null as any,
  warehouse_code: "",
  supplier_name: "",
  bill_type_code: "",
  product_code: "",
  product_name: "",
  product_model: "",
  vehicle_no: "",
  container_no: "",
  delivery_no: "",
  order_status: "",
  create_by: "",
  keyword: ""
});

const statusMap: Record<string, string> = {
  draft: "草稿",
  submit: "已提交",
  audited: "已审核",
  completed: "已完成",
  cancelled: "已取消"
};
const statusTypeMap: Record<string, string> = {
  draft: "info",
  submit: "warning",
  audited: "success",
  completed: "success",
  cancelled: "danger"
};
const billTypeOptions = ref<{ label: string; value: string }[]>([]);

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

async function searchSuppliers(q: string) {
  if (!q) {
    supplierOptions.value = [];
    return;
  }
  const res = await api.get("/supplier/list", {
    params: { keyword: q, pageSize: 50 }
  });
  supplierOptions.value = (res.data.list || []).map((s: any) => ({
    label: s.supplier_name,
    value: s.supplier_name
  }));
}
async function searchProducts(q: string) {
  if (!q) {
    productOptions.value = [];
    return;
  }
  const res = await api.get("/product/search", { params: { keyword: q } });
  productOptions.value = (res.data || []).map((p: any) => ({
    label: `${p.product_code} / ${p.product_name}`,
    value: p.product_code,
    name: p.product_name,
    model: p.product_model
  }));
}
async function searchVehicles(q: string) {
  if (!q) {
    vehicleOptions.value = [];
    return;
  }
  const res = await api.get("/vehicle/search", { params: { keyword: q } });
  vehicleOptions.value = (res.data || []).map((v: any) => ({
    label: v.plate_number,
    value: v.plate_number
  }));
}

const filterTags = computed(() => {
  const tags: any[] = [];
  if (quickFilter.startDate)
    tags.push({
      source: "quick",
      key: "startDate",
      label: `开始: ${quickFilter.startDate}`
    });
  if (quickFilter.endDate)
    tags.push({
      source: "quick",
      key: "endDate",
      label: `结束: ${quickFilter.endDate}`
    });
  if (quickFilter.warehouse_code) {
    const w = warehouses.value.find(
      (i: any) => i.warehouse_code === quickFilter.warehouse_code
    );
    tags.push({
      source: "quick",
      key: "warehouse_code",
      label: `仓库: ${w?.warehouse_name || quickFilter.warehouse_code}`
    });
  }
  if (quickFilter.order_status)
    tags.push({
      source: "quick",
      key: "order_status",
      label: `状态: ${statusMap[quickFilter.order_status]}`
    });
  if (quickFilter.keyword)
    tags.push({
      source: "quick",
      key: "keyword",
      label: `关键字: ${quickFilter.keyword}`
    });
  if (drawerFilter.order_no)
    tags.push({
      source: "drawer",
      key: "order_no",
      label: `单号: ${drawerFilter.order_no}`
    });
  if (drawerFilter.dateRange)
    tags.push({
      source: "drawer",
      key: "dateRange",
      label: `日期: ${drawerFilter.dateRange[0]} ~ ${drawerFilter.dateRange[1]}`
    });
  if (drawerFilter.warehouse_code) {
    const w = warehouses.value.find(
      (i: any) => i.warehouse_code === drawerFilter.warehouse_code
    );
    tags.push({
      source: "drawer",
      key: "warehouse_code",
      label: `仓库: ${w?.warehouse_name || drawerFilter.warehouse_code}`
    });
  }
  if (drawerFilter.supplier_name)
    tags.push({
      source: "drawer",
      key: "supplier_name",
      label: `供应商: ${drawerFilter.supplier_name}`
    });
  if (drawerFilter.bill_type_code)
    tags.push({
      source: "drawer",
      key: "bill_type_code",
      label: `单据类型: ${drawerFilter.bill_type_code}`
    });
  if (drawerFilter.product_code)
    tags.push({
      source: "drawer",
      key: "product_code",
      label: `商品编码: ${drawerFilter.product_code}`
    });
  if (drawerFilter.product_name)
    tags.push({
      source: "drawer",
      key: "product_name",
      label: `商品名称: ${drawerFilter.product_name}`
    });
  if (drawerFilter.product_model)
    tags.push({
      source: "drawer",
      key: "product_model",
      label: `型号: ${drawerFilter.product_model}`
    });
  if (drawerFilter.vehicle_no)
    tags.push({
      source: "drawer",
      key: "vehicle_no",
      label: `车号: ${drawerFilter.vehicle_no}`
    });
  if (drawerFilter.container_no)
    tags.push({
      source: "drawer",
      key: "container_no",
      label: `柜号: ${drawerFilter.container_no}`
    });
  if (drawerFilter.delivery_no)
    tags.push({
      source: "drawer",
      key: "delivery_no",
      label: `来货单号: ${drawerFilter.delivery_no}`
    });
  if (drawerFilter.order_status)
    tags.push({
      source: "drawer",
      key: "order_status",
      label: `状态: ${statusMap[drawerFilter.order_status]}`
    });
  if (drawerFilter.create_by)
    tags.push({
      source: "drawer",
      key: "create_by",
      label: `创建人: ${drawerFilter.create_by}`
    });
  if (drawerFilter.keyword)
    tags.push({
      source: "drawer",
      key: "keyword",
      label: `关键字: ${drawerFilter.keyword}`
    });
  return tags;
});

const advancedTagCount = computed(
  () => filterTags.value.filter(t => t.source === "drawer").length
);

function clearFilterTag(tag: any) {
  if (tag.source === "quick") {
    (quickFilter as any)[tag.key] = "";
  } else {
    if (tag.key === "dateRange") drawerFilter.dateRange = null;
    else (drawerFilter as any)[tag.key] = "";
  }
  search();
}
function clearAllFilters() {
  Object.assign(quickFilter, {
    startDate: "",
    endDate: "",
    warehouse_code: "",
    order_status: "",
    keyword: ""
  });
  Object.assign(drawerFilter, {
    order_no: "",
    dateRange: null,
    warehouse_code: "",
    supplier_name: "",
    bill_type_code: "",
    product_code: "",
    product_name: "",
    product_model: "",
    vehicle_no: "",
    container_no: "",
    delivery_no: "",
    order_status: "",
    create_by: "",
    keyword: ""
  });
  search();
}

const columns: any[] = [
  { type: "index", label: "#", width: 50, align: "center", fixed: "left" },
  {
    label: "商品编码",
    prop: "product_code",
    minWidth: 110,
    align: "left",
    showOverflowTooltip: true
  },
  {
    label: "商品名称",
    prop: "product_name",
    minWidth: 120,
    align: "left",
    showOverflowTooltip: true
  },
  {
    label: "型号",
    prop: "product_model",
    minWidth: 100,
    align: "left",
    showOverflowTooltip: true
  },
  {
    label: "入库单号",
    prop: "order_no",
    minWidth: 170,
    align: "left",
    showOverflowTooltip: true
  },
  {
    label: "入库日期",
    prop: "inbound_date",
    minWidth: 110,
    align: "center",
    slot: "inbound_date"
  },
  {
    label: "单据类型",
    prop: "bill_type_code",
    minWidth: 100,
    align: "center",
    slot: "bill_type_code"
  },
  {
    label: "状态",
    prop: "order_status",
    slot: "order_status",
    width: 80,
    align: "center"
  },
  {
    label: "仓库",
    prop: "warehouse_name",
    minWidth: 130,
    align: "left",
    showOverflowTooltip: true
  },
  {
    label: "供应商",
    prop: "supplier_name",
    minWidth: 140,
    align: "left",
    showOverflowTooltip: true
  },
  {
    label: "入库数量",
    prop: "inbound_qty",
    minWidth: 90,
    align: "right",
    showOverflowTooltip: true
  },
  {
    label: "入库重量(吨)",
    prop: "inbound_weight",
    slot: "inbound_weight",
    minWidth: 120,
    align: "right",
    showOverflowTooltip: true
  },
  {
    label: "车号",
    prop: "vehicle_no",
    minWidth: 100,
    align: "left",
    showOverflowTooltip: true
  },
  {
    label: "柜号",
    prop: "container_no",
    minWidth: 100,
    align: "left",
    showOverflowTooltip: true
  },
  {
    label: "来货单号",
    prop: "delivery_no",
    minWidth: 130,
    align: "left",
    showOverflowTooltip: true
  },
  { label: "创建人", prop: "create_by", minWidth: 90, align: "left" },
  {
    label: "创建时间",
    prop: "create_time",
    slot: "create_time",
    minWidth: 150,
    align: "center"
  },
  { label: "审核人", prop: "audit_by", minWidth: 90, align: "left" },
  {
    label: "审核时间",
    prop: "audit_time",
    slot: "audit_time",
    minWidth: 150,
    align: "center"
  },
  {
    label: "备注",
    prop: "remark",
    minWidth: 120,
    align: "left",
    showOverflowTooltip: true
  }
];

function buildParams() {
  const params: any = {
    page: pagination.currentPage,
    pageSize: pagination.pageSize
  };
  Object.entries(quickFilter).forEach(([k, v]) => {
    if (v) params[k] = v;
  });
  Object.entries(drawerFilter).forEach(([k, v]) => {
    if (v && k !== "dateRange") params[k] = v;
  });
  if (drawerFilter.dateRange?.length === 2) {
    params.startDate = drawerFilter.dateRange[0];
    params.endDate = drawerFilter.dateRange[1];
  }
  return params;
}

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get("/report/inbound-detail", {
      params: buildParams()
    });
    list.value = res.data.list;
    pagination.total = res.data.total;
  } finally {
    loading.value = false;
  }
}

function search() {
  pagination.currentPage = 1;
  fetchData();
}
function resetQuick() {
  Object.assign(quickFilter, {
    startDate: "",
    endDate: "",
    warehouse_code: "",
    order_status: "",
    keyword: ""
  });
}
function onPageChange(p: number) {
  pagination.currentPage = p;
  fetchData();
}
function onPageSizeChange(s: number) {
    localStorage.setItem("page-size-InboundDetail", String(s));
  pagination.pageSize = s;
  pagination.currentPage = 1;
  fetchData();
}
function applyDrawer() {
  pagination.currentPage = 1;
  drawerVisible.value = false;
  fetchData();
}
function resetDrawer() {
  Object.assign(drawerFilter, {
    order_no: "",
    dateRange: null,
    warehouse_code: "",
    supplier_name: "",
    bill_type_code: "",
    product_code: "",
    product_name: "",
    product_model: "",
    vehicle_no: "",
    container_no: "",
    delivery_no: "",
    order_status: "",
    create_by: "",
    keyword: ""
  });
  supplierOptions.value = [];
  productOptions.value = [];
  vehicleOptions.value = [];
}

const hasAnyFilter = computed(() => filterTags.value.length > 0);
const statsCards = computed(() => [
  { label: "总记录数", value: pagination.total || list.value.length, color: "var(--el-color-primary)", icon: Download },
  { label: "本页", value: list.value.length, color: "#67c23a", icon: Box },
  { label: "筛选", value: filterTags.value.length || 0, color: "var(--el-color-info)", icon: Filter }
]);

const exportFileName = computed(() => {
  const p: string[] = ["入库明细报表"];
  const b = buildParams();
  if (b.startDate && b.endDate) p.push(`${b.startDate}~${b.endDate}`);
  return p.join("_") + ".xlsx";
});

async function exportData() {
  if (!hasAnyFilter.value) {
    ElMessage.warning("为保证系统性能，请先设置筛选条件后再导出！");
    return;
  }
  exporting.value = true;
  try {
    const params: any = { ...buildParams() };
    const res = await api.get("/report/inbound-detail/export", {
      params,
      responseType: "blob"
    });
    const url = URL.createObjectURL(res as any);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName.value;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("导出成功");
  } finally {
    exporting.value = false;
  }
}

function formatTime(t: string) {
  if (!t) return "—";
  return new Date(t).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).replace(/\//g, "-");
}

async function loadDict() {
  try {
    const res = await api.get("/sys/dict/data/inbound_type");
    billTypeOptions.value = (res.data || []).map((d: any) => ({
      label: d.dict_label,
      value: d.dict_value
    }));
  } catch { /* 字典加载失败使用空数组 */ }
}

onMounted(async () => {
  loadDict();
  const [whRes, spRes] = await Promise.all([
    api.get("/warehouse/list", { params: { pageSize: 999 } }),
    api.get("/supplier/list", { params: { pageSize: 999 } })
  ]);
  warehouses.value = whRes.data.list || [];
  suppliers.value = spRes.data.list || [];
});
</script>

<template>
  <div class="px-5 py-4">
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in statsCards"
        :key="card.label"
        class="wms-card flex-1 flex items-center gap-3"
        :style="{ padding: '16px 20px' }"
      >
        <div class="flex items-center justify-center rounded-lg" :style="{ width: '40px', height: '40px', background: card.color + '15', color: card.color }">
          <el-icon :size="20"><component :is="useRenderIcon(card.icon)" /></el-icon>
        </div>
        <div>
          <div class="text-xs" :style="{ color: 'var(--el-text-color-secondary)' }">{{ card.label }}</div>
          <div class="text-xl font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">{{ card.value }}</div>
        </div>
      </div>
    </div>

    <!-- 筛选卡片 -->
    <div
      class="wms-card mb-4"
      :style="{ padding: '20px 24px' }"
    >
      <div
        class="flex items-center gap-2 mb-4 text-sm font-semibold"
        :style="{ color: 'var(--el-text-color-primary)' }"
      >
        <span
          class="inline-block w-1 h-4 rounded"
          :style="{ background: 'var(--el-color-primary)' }"
        />筛选条件
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <el-form :inline="true" :model="quickFilter" class="mb-0!">
          <el-form-item label="入库日期" class="mb-0!">
            <div class="flex items-center gap-1">
              <el-date-picker
                v-model="quickFilter.startDate"
                type="date"
                placeholder="开始"
                value-format="YYYY-MM-DD"
                :prefix-icon="useRenderIcon(Calendar)"
                class="w-35!"
              />
              <span class="text-gray-400">至</span>
              <el-date-picker
                v-model="quickFilter.endDate"
                type="date"
                placeholder="结束"
                value-format="YYYY-MM-DD"
                :prefix-icon="useRenderIcon(Calendar)"
                class="w-35!"
              />
            </div>
          </el-form-item>
          <el-form-item label="仓库" class="mb-0!">
            <el-select
              v-model="quickFilter.warehouse_code"
              clearable
              placeholder="请选择"
              :prefix-icon="useRenderIcon(OfficeBuilding)"
              class="w-40!"
            >
              <el-option
                v-for="w in warehouses"
                :key="w.warehouse_code"
                :label="w.warehouse_name"
                :value="w.warehouse_code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态" class="mb-0!">
            <el-select
              v-model="quickFilter.order_status"
              clearable
              placeholder="请选择"
              class="w-32.5!"
            >
              <el-option label="草稿" value="draft" /><el-option
                label="已提交"
                value="submit"
              />
              <el-option label="已审核" value="audited" /><el-option
                label="已完成"
                value="completed"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="关键字" class="mb-0!">
            <el-input
              v-model="quickFilter.keyword"
              clearable
              placeholder="单号/商品/供应商"
              class="w-45!"
              @keyup.enter="search"
            />
          </el-form-item>
        </el-form>
        <el-divider direction="vertical" class="h-6!" />
        <div class="flex items-center gap-2">
          <el-button
            type="primary"
            :icon="useRenderIcon(Search)"
            :loading="loading"
            size="default"
            @click="search"
            >查询</el-button
          >
          <el-button
            :icon="useRenderIcon(Refresh)"
            size="default"
            @click="resetQuick"
            >重置</el-button
          >
        </div>
        <el-divider direction="vertical" class="h-6!" />
        <div class="flex items-center gap-2">
          <el-button
            :icon="useRenderIcon(Filter)"
            size="default"
            @click="drawerVisible = true"
            >高级筛选<template v-if="advancedTagCount"
              >&nbsp;{{ advancedTagCount }}</template
            ></el-button
          >
          <el-button
            type="success"
            :icon="useRenderIcon(Download)"
            size="default"
            :loading="exporting"
            @click="exportData"
            >导出 Excel</el-button
          >
        </div>
      </div>
    </div>

    <!-- 筛选标签 -->
    <div v-if="filterTags.length" class="flex items-center gap-1 mb-4 text-sm">
      <span class="text-gray-500">当前筛选：</span>
      <el-tag
        v-for="t in filterTags"
        :key="t.source + t.key"
        closable
        effect="plain"
        size="small"
        @close="clearFilterTag(t)"
        >{{ t.label }}</el-tag
      >
      <el-button type="primary" link size="small" @click="clearAllFilters"
        >清除全部</el-button
      >
    </div>

    <!-- 表格区域 -->
    <PureTableBar title="入库明细报表" :columns="columns" storage-key="InboundDetail" @refresh="search">
      <template v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }">
        <pure-table :key="tableRefreshKey"
          @header-dragend="(newWidth, _oldWidth, col) => onColumnResize(col.label || col.property, newWidth)"
          row-key="id"
          border
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="left"
         
          stripe
          :loading="loading"
          :size="size"
          :data="list"
          :columns="dynamicColumns"
          :pagination="{ ...pagination, size }"
          :header-cell-style="headerCellStyle"
          @page-size-change="onPageSizeChange"
          @page-current-change="onPageChange"
        >
          <template #empty>
            <EmptyState title="暂无入库明细数据" description="请设置筛选条件后点击查询" />
          </template>
          <template #inbound_date="{ row }">{{
            formatTime(row.inbound_date)
          }}</template>
          <template #inbound_weight="{ row }">{{
            Number(row.inbound_weight || 0).toFixed(4)
          }}</template>
          <template #bill_type_code="{ row }">
            <el-tag effect="plain" type="info" size="small">{{
              row.bill_type_code
            }}</el-tag>
          </template>
          <template #order_status="{ row }">
            <el-tag
              effect="plain"
              :type="statusTypeMap[row.order_status] || 'info'"
              size="small"
            >{{ statusMap[row.order_status] || row.order_status }}</el-tag>
          </template>
          <template #create_time="{ row }">{{
            formatTime(row.create_time)
          }}</template>
          <template #audit_time="{ row }">{{
            formatTime(row.audit_time)
          }}</template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 高级筛选抽屉 -->
    <el-drawer v-model="drawerVisible" title="高级筛选" size="400px">
      <div v-if="advancedTagCount" class="mb-4">
        <div class="text-xs text-gray-500 mb-2">当前高级筛选：</div>
        <el-tag
          v-for="t in filterTags.filter(t => t.source === 'drawer')"
          :key="t.key"
          closable
          effect="plain"
          size="small"
          class="mr-1 mb-1"
          @close="clearFilterTag(t)"
          >{{ t.label }}</el-tag
        >
        <el-button type="primary" link size="small" @click="resetDrawer"
          >清除高级筛选</el-button
        >
      </div>
      <div class="drawer-section">
        <div class="drawer-section__title">基础筛选</div>
        <div class="drawer-field">
          <label>单据编号</label
          ><el-input
            v-model="drawerFilter.order_no"
            clearable
            placeholder="模糊查询"
          />
        </div>
        <div class="drawer-field">
          <label>日期范围</label
          ><el-date-picker
            v-model="drawerFilter.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            class="w-full!"
          />
        </div>
        <div class="drawer-field">
          <label>仓库</label
          ><el-select
            v-model="drawerFilter.warehouse_code"
            clearable
            filterable
            class="w-full!"
            ><el-option
              v-for="w in warehouses"
              :key="w.warehouse_code"
              :label="w.warehouse_name"
              :value="w.warehouse_code"
          /></el-select>
        </div>
        <div class="drawer-field">
          <label>状态</label
          ><el-select
            v-model="drawerFilter.order_status"
            clearable
            class="w-full!"
            ><el-option label="草稿" value="draft" /><el-option
              label="已提交"
              value="submit" /><el-option
              label="已审核"
              value="audited" /><el-option label="已完成" value="completed"
          /></el-select>
        </div>
      </div>
      <div class="drawer-section">
        <div class="drawer-section__title">业务信息</div>
        <div class="drawer-field">
          <label>单据类型</label
          ><el-select
            v-model="drawerFilter.bill_type_code"
            clearable
            class="w-full!"
            ><el-option
              v-for="t in billTypeOptions"
              :key="t.value"
              :label="t.label"
              :value="t.value"
          /></el-select>
        </div>
        <div class="drawer-field">
          <label>供应商名称</label
          ><el-select
            v-model="drawerFilter.supplier_name"
            clearable
            filterable
            remote
            allow-create
            :remote-method="searchSuppliers"
            placeholder="输入关键词搜索"
            class="w-full!"
            ><el-option
              v-for="s in supplierOptions"
              :key="s.value"
              :label="s.label"
              :value="s.value"
          /></el-select>
        </div>
        <div class="drawer-field">
          <label>商品编码</label
          ><el-select
            v-model="drawerFilter.product_code"
            clearable
            filterable
            remote
            allow-create
            :remote-method="searchProducts"
            placeholder="输入关键词搜索"
            class="w-full!"
            ><el-option
              v-for="p in productOptions"
              :key="p.value"
              :label="p.value"
              :value="p.value"
          /></el-select>
        </div>
        <div class="drawer-field">
          <label>商品名称</label
          ><el-select
            v-model="drawerFilter.product_name"
            clearable
            filterable
            remote
            allow-create
            :remote-method="searchProducts"
            placeholder="输入关键词搜索"
            class="w-full!"
            ><el-option
              v-for="p in productOptions"
              :key="p.value"
              :label="p.name"
              :value="p.name"
          /></el-select>
        </div>
        <div class="drawer-field">
          <label>型号</label
          ><el-select
            v-model="drawerFilter.product_model"
            clearable
            filterable
            remote
            allow-create
            :remote-method="searchProducts"
            placeholder="输入关键词搜索"
            class="w-full!"
            ><el-option
              v-for="p in productOptions"
              :key="p.value"
              :label="p.model"
              :value="p.model"
          /></el-select>
        </div>
        <div class="drawer-field">
          <label>车号</label
          ><el-select
            v-model="drawerFilter.vehicle_no"
            clearable
            filterable
            remote
            allow-create
            :remote-method="searchVehicles"
            placeholder="输入关键词搜索"
            class="w-full!"
            ><el-option
              v-for="v in vehicleOptions"
              :key="v.value"
              :label="v.label"
              :value="v.value"
          /></el-select>
        </div>
        <div class="drawer-field">
          <label>柜号</label
          ><el-input
            v-model="drawerFilter.container_no"
            clearable
            placeholder="模糊查询"
          />
        </div>
        <div class="drawer-field">
          <label>来货单号</label
          ><el-input
            v-model="drawerFilter.delivery_no"
            clearable
            placeholder="模糊查询"
          />
        </div>
        <div class="drawer-field">
          <label>创建人</label
          ><el-input
            v-model="drawerFilter.create_by"
            clearable
            placeholder="模糊查询"
          />
        </div>
        <div class="drawer-field">
          <label>关键字</label
          ><el-input
            v-model="drawerFilter.keyword"
            clearable
            placeholder="全局模糊查询"
          />
        </div>
      </div>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="resetDrawer">重置</el-button>
          <el-button type="primary" :loading="loading" @click="applyDrawer">查询</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
/* ── 表格行高 48px ── */
:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}

:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}

/* ── 抽屉分组 ── */
.drawer-section {
  margin-bottom: 20px;
}

.drawer-section + .drawer-section {
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.drawer-section__title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.drawer-field {
  margin-bottom: 14px;
}

.drawer-field > label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.drawer-field > :deep(.el-select),
.drawer-field > :deep(.el-date-picker) {
  width: 100%;
}

.drawer-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>

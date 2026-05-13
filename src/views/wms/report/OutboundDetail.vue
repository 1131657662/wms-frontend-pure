<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import {
  formatDate,
  formatOrderStatus,
  ORDER_STATUS_MAP
} from "@/utils/format";
import Calendar from "~icons/ri/calendar-2-line";
import OfficeBuilding from "~icons/ep/office-building";
import Search from "~icons/ep/search";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";
import Filter from "~icons/ep/filter";
import Upload from "~icons/ep/upload";
import ShoppingCartFull from "~icons/ep/shopping-cart-full";

defineOptions({ name: "OutboundDetail" });

const list = ref<any[]>([]);
const loading = ref(false);
const exporting = ref(false);
const warehouses = ref<any[]>([]);
const customers = ref<any[]>([]);
const customerOptions = ref<any[]>([]);
const productOptions = ref<any[]>([]);
const vehicleOptions = ref<any[]>([]);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-OutboundDetail")) || 20,
  currentPage: 1,
  background: true
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
  customer_name: "",
  bill_type_code: "",
  product_code: "",
  product_name: "",
  product_model: "",
  vehicle_no: "",
  container_no: "",
  contract_no: "",
  order_status: "",
  create_by: "",
  keyword: ""
});

const statusFilterOptions = computed(() =>
  Object.entries(ORDER_STATUS_MAP).map(([value, label]) => ({ label, value }))
);

const billTypeOptions = ref<{ label: string; value: string }[]>([]);
const billTypeMap = reactive<Record<string, string>>({});

async function searchCustomers(q: string) {
  if (!q) {
    customerOptions.value = [];
    return;
  }
  const res = await api.get("/customer/list", {
    params: { keyword: q, pageSize: 200 }
  });
  customerOptions.value = (res.data.list || []).map((c: any) => ({
    label: c.customer_name,
    value: c.customer_name
  }));
}
async function searchProducts(q: string) {
  if (!q) {
    productOptions.value = [];
    return;
  }
  const res = await api.get("/product/search", {
    params: { keyword: q, pageSize: 200 }
  });
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
  const res = await api.get("/vehicle/search", {
    params: { keyword: q, pageSize: 200 }
  });
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
      label: `状态: ${formatOrderStatus(quickFilter.order_status).label}`
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
  if (drawerFilter.customer_name)
    tags.push({
      source: "drawer",
      key: "customer_name",
      label: `客户: ${drawerFilter.customer_name}`
    });
  if (drawerFilter.bill_type_code)
    tags.push({
      source: "drawer",
      key: "bill_type_code",
      label: `单据类型: ${billTypeMap[drawerFilter.bill_type_code] || drawerFilter.bill_type_code}`
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
  if (drawerFilter.contract_no)
    tags.push({
      source: "drawer",
      key: "contract_no",
      label: `合同号: ${drawerFilter.contract_no}`
    });
  if (drawerFilter.order_status)
    tags.push({
      source: "drawer",
      key: "order_status",
      label: `状态: ${formatOrderStatus(drawerFilter.order_status).label}`
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
    customer_name: "",
    bill_type_code: "",
    product_code: "",
    product_name: "",
    product_model: "",
    vehicle_no: "",
    container_no: "",
    contract_no: "",
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
    label: "出库单号",
    prop: "order_no",
    minWidth: 170,
    align: "left",
    showOverflowTooltip: true
  },
  {
    label: "出库日期",
    prop: "outbound_date",
    slot: "outbound_date",
    minWidth: 110,
    align: "center"
  },
  {
    label: "单据类型",
    prop: "bill_type_code",
    slot: "bill_type_code",
    minWidth: 100,
    align: "center"
  },
  {
    label: "状态",
    prop: "order_status",
    slot: "order_status",
    width: 80,
    align: "center"
  },
  { label: "仓库", prop: "warehouse_name", minWidth: 120, align: "left" },
  { label: "仓库编码", prop: "warehouse_code", minWidth: 110, align: "left" },
  {
    label: "客户",
    prop: "customer_name",
    minWidth: 140,
    align: "left",
    showOverflowTooltip: true
  },
  { label: "客户编码", prop: "customer_code", minWidth: 110, align: "left" },
  { label: "出库数量", prop: "outbound_qty", minWidth: 90, align: "right" },
  {
    label: "出库重量(吨)",
    prop: "outbound_weight",
    slot: "outbound_weight",
    minWidth: 120,
    align: "right"
  },
  {
    label: "合同号",
    prop: "contract_no",
    minWidth: 130,
    align: "left",
    showOverflowTooltip: true
  },
  { label: "车号", prop: "vehicle_no", minWidth: 100, align: "left" },
  { label: "柜号", prop: "container_no", minWidth: 100, align: "left" },
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
  { label: "联系人", prop: "contact_person", minWidth: 90, align: "left" },
  { label: "电话", prop: "contact_phone", minWidth: 120, align: "left" },
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
    const res = await api.get("/report/outbound-detail", {
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
  localStorage.setItem("page-size-OutboundDetail", String(s));
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
    customer_name: "",
    bill_type_code: "",
    product_code: "",
    product_name: "",
    product_model: "",
    vehicle_no: "",
    container_no: "",
    contract_no: "",
    order_status: "",
    create_by: "",
    keyword: ""
  });
  customerOptions.value = [];
  productOptions.value = [];
  vehicleOptions.value = [];
}

const hasAnyFilter = computed(() => filterTags.value.length > 0);
const statsCards = computed(() => [
  {
    label: "总记录数",
    value: pagination.total || list.value.length,
    color: "var(--el-color-primary)",
    icon: Upload
  },
  {
    label: "本页",
    value: list.value.length,
    color: "#67c23a",
    icon: ShoppingCartFull
  },
  {
    label: "筛选",
    value: filterTags.value.length || 0,
    color: "var(--el-color-info)",
    icon: Filter
  }
]);

function formatTime(t: string) {
  if (!t) return "—";
  return new Date(t)
    .toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
    .replace(/\//g, "-");
}

const exportFileName = computed(() => {
  const p: string[] = ["出库明细报表"];
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
    const res = await api.get("/report/outbound-detail/export", {
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

async function loadDict() {
  try {
    const res = await api.get("/sys/dict/data/outbound_type");
    const blist = res.data || [];
    billTypeOptions.value = blist.map((d: any) => ({
      label: d.dict_label,
      value: d.dict_value
    }));
    for (const d of blist) {
      billTypeMap[d.dict_value] = d.dict_label;
    }
  } catch {
    /* 字典加载失败使用空数组 */
  }
}

onMounted(async () => {
  loadDict();
  const [whRes, cuRes] = await Promise.all([
    api.get("/warehouse/list", { params: { pageSize: 999 } }),
    api.get("/customer/list", { params: { pageSize: 999 } })
  ]);
  warehouses.value = whRes.data.list || [];
  customers.value = cuRes.data.list || [];
});
</script>

<template>
  <div class="p-5">
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in statsCards"
        :key="card.label"
        class="wms-card flex-1 flex items-center gap-3"
        :style="{ padding: '16px 20px' }"
      >
        <div
          class="flex-c rounded-lg"
          :style="{
            width: '40px',
            height: '40px',
            background: card.color + '15',
            color: card.color
          }"
        >
          <el-icon :size="20"
            ><component :is="useRenderIcon(card.icon)"
          /></el-icon>
        </div>
        <div>
          <div
            class="text-xs"
            :style="{ color: 'var(--el-text-color-secondary)' }"
          >
            {{ card.label }}
          </div>
          <div
            class="text-xl font-semibold"
            :style="{ color: 'var(--el-text-color-primary)' }"
          >
            {{ card.value }}
          </div>
        </div>
      </div>
    </div>

    <div class="wms-card mb-4" :style="{ padding: '20px 24px' }">
      <div
        class="flex items-center gap-2 mb-4 text-sm font-semibold"
        :style="{ color: 'var(--el-text-color-primary)' }"
      >
        <span
          class="inline-block w-1 h-4 rounded"
          :style="{ background: 'var(--el-color-primary)' }"
        />筛选条件
      </div>
      <div
        v-if="filterTags.length"
        class="flex items-center gap-1 flex-wrap mb-3"
      >
        <span
          class="text-xs mr-1"
          :style="{ color: 'var(--el-text-color-secondary)' }"
          >当前筛选：</span
        >
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
      <div class="flex items-center gap-3 flex-wrap">
        <el-form :inline="true" class="mb-0!">
          <el-form-item label="出库日期" class="mb-0!">
            <div class="flex items-center gap-1">
              <el-date-picker
                v-model="quickFilter.startDate"
                type="date"
                placeholder="开始"
                value-format="YYYY-MM-DD"
                :prefix-icon="useRenderIcon(Calendar)"
                class="w-34!"
              />
              <span :style="{ color: 'var(--el-text-color-secondary)' }"
                >至</span
              >
              <el-date-picker
                v-model="quickFilter.endDate"
                type="date"
                placeholder="结束"
                value-format="YYYY-MM-DD"
                :prefix-icon="useRenderIcon(Calendar)"
                class="w-34!"
              />
            </div>
          </el-form-item>
          <el-form-item label="仓库" class="mb-0!">
            <el-select
              v-model="quickFilter.warehouse_code"
              clearable
              placeholder="请选择"
              :prefix-icon="useRenderIcon(OfficeBuilding)"
              class="w-36!"
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
              class="w-28!"
            >
              <el-option
                v-for="s in statusFilterOptions"
                :key="s.value"
                :label="s.label"
                :value="s.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="关键字" class="mb-0!">
            <el-input
              v-model="quickFilter.keyword"
              clearable
              placeholder="单号/商品/客户"
              class="w-44!"
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
            >高级筛选<template v-if="advancedTagCount">
              ({{ advancedTagCount }})</template
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

    <PureTableBar
      title="出库明细报表"
      :columns="columns"
      storage-key="OutboundDetail"
      @refresh="search"
    >
      <template
        v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }"
      >
        <pure-table
          :key="tableRefreshKey"
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
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)',
            fontWeight: 600,
            height: '48px'
          }"
          @header-dragend="
            (newWidth, _oldWidth, col) =>
              onColumnResize(col.label || col.property, newWidth)
          "
          @page-size-change="onPageSizeChange"
          @page-current-change="onPageChange"
        >
          <template #empty>
            <EmptyState
              title="暂无出库明细数据"
              description="请调整筛选条件后重试"
            />
          </template>
          <template #outbound_date="{ row }">{{
            formatDate(row.outbound_date)
          }}</template>
          <template #outbound_weight="{ row }">{{
            Number(row.outbound_weight || 0).toFixed(4)
          }}</template>
          <template #bill_type_code="{ row }"
            ><el-tag effect="plain" type="info" size="small">{{
              row.bill_type_code
            }}</el-tag></template
          >
          <template #order_status="{ row }"
            ><el-tag
              effect="plain"
              :type="formatOrderStatus(row.order_status).type"
              size="small"
              >{{ formatOrderStatus(row.order_status).label }}</el-tag
            ></template
          >
          <template #create_time="{ row }">{{
            formatTime(row.create_time)
          }}</template>
          <template #audit_time="{ row }">{{
            formatTime(row.audit_time)
          }}</template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-drawer v-model="drawerVisible" title="高级筛选" size="400px">
      <div v-if="filterTags.length" class="mb-4">
        <div
          class="text-xs mb-2"
          :style="{ color: 'var(--el-text-color-secondary)' }"
        >
          当前筛选：
        </div>
        <el-tag
          v-for="t in filterTags"
          :key="t.source + t.key"
          closable
          effect="plain"
          size="small"
          class="mr-1 mb-1"
          @close="clearFilterTag(t)"
          >{{ t.label }}</el-tag
        >
        <el-button type="primary" link size="small" @click="clearAllFilters"
          >清除全部</el-button
        >
      </div>
      <el-form :model="drawerFilter" label-width="100px">
        <div
          class="text-xs font-semibold mb-3"
          :style="{ color: 'var(--el-text-color-secondary)' }"
        >
          基础筛选
        </div>
        <el-form-item label="单据编号"
          ><el-input
            v-model="drawerFilter.order_no"
            clearable
            placeholder="模糊查询"
        /></el-form-item>
        <el-form-item label="日期范围"
          ><el-date-picker
            v-model="drawerFilter.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            class="w-full!"
        /></el-form-item>
        <el-form-item label="仓库"
          ><el-select
            v-model="drawerFilter.warehouse_code"
            clearable
            filterable
            class="w-full!"
            ><el-option
              v-for="w in warehouses"
              :key="w.warehouse_code"
              :label="w.warehouse_name"
              :value="w.warehouse_code" /></el-select
        ></el-form-item>
        <el-form-item label="客户名称"
          ><el-select
            v-model="drawerFilter.customer_name"
            clearable
            filterable
            remote
            allow-create
            :remote-method="searchCustomers"
            placeholder="输入关键词搜索"
            class="w-full!"
            ><el-option
              v-for="c in customerOptions"
              :key="c.value"
              :label="c.label"
              :value="c.value" /></el-select
        ></el-form-item>
        <el-form-item label="商品编码"
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
              :value="p.value" /></el-select
        ></el-form-item>
        <el-form-item label="商品名称"
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
              :label="`${p.name} (${p.value})`"
              :value="p.name" /></el-select
        ></el-form-item>
        <el-form-item label="型号"
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
              :label="`${p.model || '-'} (${p.value})`"
              :value="p.model" /></el-select
        ></el-form-item>
        <el-form-item label="状态"
          ><el-select
            v-model="drawerFilter.order_status"
            clearable
            class="w-full!"
            ><el-option
              v-for="s in statusFilterOptions"
              :key="s.value"
              :label="s.label"
              :value="s.value" /></el-select
        ></el-form-item>
        <el-divider />
        <div
          class="text-xs font-semibold mb-3"
          :style="{ color: 'var(--el-text-color-secondary)' }"
        >
          业务信息
        </div>
        <el-form-item label="单据类型"
          ><el-select
            v-model="drawerFilter.bill_type_code"
            clearable
            class="w-full!"
            ><el-option
              v-for="t in billTypeOptions"
              :key="t.value"
              :label="t.label"
              :value="t.value" /></el-select
        ></el-form-item>
        <el-form-item label="车号"
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
              :value="v.value" /></el-select
        ></el-form-item>
        <el-form-item label="柜号"
          ><el-input
            v-model="drawerFilter.container_no"
            clearable
            placeholder="模糊查询"
        /></el-form-item>
        <el-form-item label="合同号"
          ><el-input
            v-model="drawerFilter.contract_no"
            clearable
            placeholder="模糊查询"
        /></el-form-item>
        <el-form-item label="创建人"
          ><el-input
            v-model="drawerFilter.create_by"
            clearable
            placeholder="模糊查询"
        /></el-form-item>
        <el-form-item label="关键字"
          ><el-input
            v-model="drawerFilter.keyword"
            clearable
            placeholder="全局模糊查询"
        /></el-form-item>
      </el-form>
      <template #footer>
        <div class="flex-bc w-full">
          <el-button @click="drawerVisible = false">关闭</el-button>
          <div class="flex gap-2">
            <el-button @click="resetDrawer">重置</el-button>
            <el-button type="primary" :loading="loading" @click="applyDrawer"
              >查询</el-button
            >
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}

:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}
</style>

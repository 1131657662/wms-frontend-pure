<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";

import AddFill from "~icons/ri/add-circle-line";
import Search from "~icons/ri/search-line";
import Download from "~icons/ep/download";
import Upload from "~icons/ep/upload";
import UploadFilled from "~icons/ep/upload-filled";
import Box from "~icons/ep/box";
import Warning from "~icons/ep/warning";
import Check from "~icons/ep/circle-check";

defineOptions({ name: "StockList" });
const router = useRouter();

const searchForm = reactive({ keyword: "" });
const dataList = ref([]);
const loading = ref(false);
const exporting = ref(false);
const pagination = reactive({
  total: 0, pageSize: Number(localStorage.getItem("page-size-StockList")) || 20, currentPage: 1, background: true,
  pageSizes: [10, 20, 50, 100, 500, 1000]
});
const warehouses = ref<any[]>([]);

// ==================== 预警计算 ====================
function alertStatus(row: any) {
  if (Number(row.stock_qty) === 0) return "零库存";
  const w = Number(row.stock_weight) || 0;
  const min = Number(row.min_alert_weight);
  const max = Number(row.max_alert_weight);
  if (min && w < min) return "低库存";
  if (max && w > max) return "高库存";
  return "正常";
}

function alertTagType(row: any): "info" | "danger" | "warning" | "success" {
  const s = alertStatus(row);
  if (s === "零库存") return "info";
  if (s === "低库存") return "danger";
  if (s === "高库存") return "warning";
  return "success";
}

const alertLabelMap: Record<string, string> = { low: "低库存", high: "高库存", normal: "正常", zero: "零库存" };

// ==================== 统计 ====================
const stats = computed(() => ({
  total: pagination.total,
  low: dataList.value.filter((r: any) => alertStatus(r) === "低库存" || alertStatus(r) === "零库存").length,
  high: dataList.value.filter((r: any) => alertStatus(r) === "高库存").length
}));

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

// ==================== 列定义 ====================
const columns: any[] = [
  { type: "index", label: "#", width: 56, index: (i: number) => (pagination.currentPage - 1) * pagination.pageSize + i + 1 },
  { label: "仓库编码", prop: "warehouse_code", width: 110, showOverflowTooltip: true },
  { label: "仓库名称", prop: "warehouse_name", minWidth: 130, showOverflowTooltip: true },
  { label: "产品编码", prop: "product_code", width: 130, showOverflowTooltip: true },
  { label: "产品名称", prop: "product_name", minWidth: 150, showOverflowTooltip: true },
  { label: "型号", prop: "product_model", minWidth: 150, showOverflowTooltip: true },
  { label: "库存件数", prop: "stock_qty", width: 100, align: "right" },
  { label: "库存吨位", slot: "stock_weight", width: 110, align: "right" },
  { label: "预警下限", slot: "min_alert_weight", width: 110, align: "right" },
  { label: "预警上限", slot: "max_alert_weight", width: 110, align: "right" },
  { label: "预警状态", slot: "alert_status", width: 100, align: "center" },
  { label: "操作", slot: "operation", width: 130, fixed: "right", align: "center" }
];

// ==================== 数据请求 ====================
async function fetchData() {
  loading.value = true;
  try {
    const params: any = { page: pagination.currentPage, pageSize: pagination.pageSize };
    if (searchForm.keyword) params.keyword = searchForm.keyword;
    Object.keys(filters).forEach(k => { if ((filters as any)[k]) params[k] = (filters as any)[k]; });
    const res = await api.get("/stock/list", { params });
    dataList.value = res.data.list;
    pagination.total = res.data.total;
  } finally { loading.value = false; }
}

const onSearch = () => { pagination.currentPage = 1; fetchData(); };
const handleSizeChange = (v: number) => {
    localStorage.setItem("page-size-StockList", String(v)); pagination.pageSize = v; fetchData(); };
const handleCurrentChange = (v: number) => { pagination.currentPage = v; fetchData(); };

async function loadWarehouses() {
  try { warehouses.value = ((await api.get("/warehouse/list", { params: { pageSize: 1000, enabled: 1 } })).data.list || []); }
  catch { /* empty */ }
}

// ==================== 筛选 ====================
const filters = reactive({ warehouse_code: "", product_code: "", product_name: "", product_model: "", alert: "" });
const productOptions = ref<any[]>([]);
const productNameOptions = ref<any[]>([]);
const productModelOptions = ref<any[]>([]);
const productLoading = ref(false);

async function searchProduct(keyword?: string) {
  productLoading.value = true;
  try {
    const res = await api.get("/product/search", { params: { keyword: keyword || undefined, pageSize: 500 } });
    const data = res.data || [];
    productOptions.value = data;
    productNameOptions.value = [...new Map(data.map((p: any) => [p.product_name, p])).values()] as any[];
    productModelOptions.value = [...new Map(data.map((p: any) => [p.product_model, p])).values()].filter((p: any) => p.product_model) as any[];
  } finally { productLoading.value = false; }
}

const filterTags = computed(() => {
  const tags: any[] = [];
  if (filters.warehouse_code) tags.push({ key: "warehouse_code", label: `仓库: ${filters.warehouse_code}` });
  if (filters.product_code) tags.push({ key: "product_code", label: `产品编码: ${filters.product_code}` });
  if (filters.product_name) tags.push({ key: "product_name", label: `产品名称: ${filters.product_name}` });
  if (filters.product_model) tags.push({ key: "product_model", label: `产品型号: ${filters.product_model}` });
  if (filters.alert) tags.push({ key: "alert", label: `预警: ${alertLabelMap[filters.alert]}` });
  return tags;
});

function clearFilterTag(t: any) { (filters as any)[t.key] = ""; fetchData(); }
function applyFilters() { pagination.currentPage = 1; fetchData(); }
function resetFilters() {
  Object.assign(filters, { warehouse_code: "", product_code: "", product_name: "", product_model: "", alert: "" });
  searchForm.keyword = "";
  pagination.currentPage = 1;
  fetchData();
}

async function handleExport() {
  exporting.value = true;
  try {
    const params: any = {};
    if (searchForm.keyword) params.keyword = searchForm.keyword;
    Object.keys(filters).forEach(k => { if ((filters as any)[k]) params[k] = (filters as any)[k]; });
    const resp = await api.get("/stock/export", { params, responseType: "blob" });
    const url = URL.createObjectURL(resp as any);
    const a = document.createElement("a"); a.href = url; a.download = "库存数据.xlsx"; a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("导出成功");
  } catch (e: any) {
    ElMessage.error("导出失败");
  } finally {
    exporting.value = false;
  }
}

// ==================== 格式化 ====================
function formatStockWeight(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return Number(v).toFixed(4);
}

function formatTime(v: string) {
  if (!v) return "—";
  return new Date(v).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).replace(/\//g, "-");
}

// ==================== 流水弹窗 ====================
const journalVisible = ref(false);
const journalProduct = ref("");
const journalList = ref<any[]>([]);
const journalTotal = ref(0);
const journalPage = ref(1);
const journalPageSize = ref(20);
const journalLoading = ref(false);
let journalProductCode = "";
let journalWarehouseCode = "";

const journalColumns: any[] = [
  { label: "业务类型", slot: "business_type", width: 80, align: "center" },
  { label: "关联单号", prop: "order_no", width: 170 },
  { label: "件数变化", prop: "change_qty", width: 80, align: "right" },
  { label: "件数(前)", prop: "before_qty", width: 80, align: "right" },
  { label: "件数(后)", prop: "after_qty", width: 80, align: "right" },
  { label: "吨位变化", slot: "change_weight", width: 100, align: "right" },
  { label: "吨位(前)", slot: "before_weight", width: 100, align: "right" },
  { label: "吨位(后)", slot: "after_weight", width: 100, align: "right" },
  { label: "时间", slot: "create_time", width: 170 },
  { label: "操作人", prop: "create_by", width: 90 }
];

function businessTypeLabel(type: string) { return ({ inbound: "入库", outbound: "出库", check: "盘点", adjust: "调整" } as any)[type] || type; }

function openJournal(row: any) {
  journalProduct.value = `${row.product_code} ${row.product_name}`;
  journalProductCode = row.product_code;
  journalWarehouseCode = row.warehouse_code;
  journalPage.value = 1;
  journalVisible.value = true;
  fetchJournal();
}

async function fetchJournal() {
  journalLoading.value = true;
  try {
    const res = await api.get("/stock/journal/list", { params: { page: journalPage.value, pageSize: journalPageSize.value, product_code: journalProductCode, warehouse_code: journalWarehouseCode } });
    journalList.value = res.data.list;
    journalTotal.value = res.data.total;
  } finally { journalLoading.value = false; }
}

function onJournalPageChange(p: number) { journalPage.value = p; fetchJournal(); }

async function handleJournalExport() {
  const resp = await api.get("/stock/journal/export", { params: { product_code: journalProductCode, warehouse_code: journalWarehouseCode }, responseType: "blob" });
  const url = URL.createObjectURL(resp as any);
  const a = document.createElement("a"); a.href = url; a.download = "库存流水.xlsx"; a.click();
  URL.revokeObjectURL(url);
}

// ==================== 预警值编辑 ====================
const alertEditVisible = ref(false);
const alertEditSaving = ref(false);
const alertEditRow = ref<any>({});
const alertEditForm = reactive({ min_alert_weight: null as number | null, max_alert_weight: null as number | null });

function openAlertEdit(row: any) {
  alertEditRow.value = row;
  alertEditForm.min_alert_weight = row.min_alert_weight != null ? Number(row.min_alert_weight) : null;
  alertEditForm.max_alert_weight = row.max_alert_weight != null ? Number(row.max_alert_weight) : null;
  alertEditVisible.value = true;
}

async function saveAlertEdit() {
  alertEditSaving.value = true;
  try {
    await api.put(`/stock/${alertEditRow.value.id}`, { min_alert_weight: alertEditForm.min_alert_weight, max_alert_weight: alertEditForm.max_alert_weight });
    alertEditRow.value.min_alert_weight = alertEditForm.min_alert_weight;
    alertEditRow.value.max_alert_weight = alertEditForm.max_alert_weight;
    alertEditVisible.value = false;
    ElMessage.success("预警值设置成功");
  } catch (e: any) { ElMessage.error(e.response?.data?.message || "保存失败"); }
  finally { alertEditSaving.value = false; }
}

// ==================== 调整库存 ====================
const adjustVisible = ref(false);
const adjustSaving = ref(false);
const adjustRow = ref<any>({});
const adjustForm = reactive({ change_qty: 0, change_weight: 0, remark: "" });

function openAdjust(row: any) { adjustRow.value = row; adjustForm.change_qty = 0; adjustForm.change_weight = 0; adjustForm.remark = ""; adjustVisible.value = true; }

async function saveAdjust() {
  if (adjustForm.change_qty === 0 && adjustForm.change_weight === 0) { ElMessage.warning("请填写调整件数或调整吨位"); return; }
  adjustSaving.value = true;
  try {
    await api.post(`/stock/${adjustRow.value.id}/adjust`, { change_qty: adjustForm.change_qty, change_weight: adjustForm.change_weight, remark: adjustForm.remark });
    ElMessage.success("库存调整成功");
    adjustVisible.value = false;
    fetchData();
  } catch (e: any) { ElMessage.error(e.response?.data?.message || "调整失败"); }
  finally { adjustSaving.value = false; }
}

// ==================== 导入 ====================
const importVisible = ref(false);
const importFile = ref<any>(null);
const importing = ref(false);
const importResult = ref<any>(null);

function onImportFileChange(file: any) { importFile.value = file.raw; }
function onImportFileRemove() { importFile.value = null; importResult.value = null; }

async function downloadStockTemplate() {
  try {
    const res = await api.get("/stock/template", { responseType: "blob" });
    const url = URL.createObjectURL((res as any).data || res);
    const a = document.createElement("a"); a.href = url; a.download = "期初库存导入模板.xlsx"; a.click();
    URL.revokeObjectURL(url);
  } catch { /* ignore */ }
}

async function doStockImport() {
  if (!importFile.value) return;
  importing.value = true;
  importResult.value = null;
  try {
    const fd = new FormData(); fd.append("file", importFile.value);
    const res = await api.post("/stock/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
    importResult.value = res.data;
    if (res.data.successCount > 0) fetchData();
  } catch (e: any) { importResult.value = { successCount: 0, failCount: 1, errors: [e.response?.data?.message || "导入失败"] }; }
  finally { importing.value = false; }
}

onMounted(() => { fetchData(); loadWarehouses(); searchProduct(); });
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          { label: '库存记录', value: stats.total, color: 'var(--el-color-primary)', icon: Box },
          { label: '低库存/零库存', value: stats.low, color: stats.low > 0 ? '#f56c6c' : '#67c23a', icon: Warning },
          { label: '高库存', value: stats.high, color: stats.high > 0 ? '#e6a23c' : '#67c23a', icon: Check }
        ]"
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

    <!-- ==================== 操作卡片 ==================== -->
    <div
      class="wms-card mb-4"
    >
      <!-- 操作区 -->
      <div class="flex items-center gap-2 mb-3 text-sm font-semibold" :style="{ color: 'var(--el-text-color-primary)', padding: '16px 20px 0' }">
        <span class="inline-block w-1 h-4 rounded" :style="{ background: 'var(--el-color-primary)' }" />
        操作
      </div>
      <div class="flex items-center gap-2 flex-wrap" :style="{ padding: '8px 20px 0' }">
        <el-button type="success" :icon="useRenderIcon(Upload)" @click="importVisible = true">导入期初库存</el-button>
        <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="router.push('/stock-check/form')">发起盘点</el-button>
        <el-button plain :icon="useRenderIcon(Download)" :loading="exporting" @click="handleExport">导出 Excel</el-button>
        <div class="flex-1" />
        <el-input v-model="searchForm.keyword" placeholder="搜索编码 / 名称 / 型号 / 仓库..." clearable class="w-64!" @clear="fetchData" @keyup.enter="onSearch" />
      </div>

      <!-- 分割线 -->
      <div class="border-t border-gray-200" style="margin: 16px 20px 0" />

      <!-- 筛选区 -->
      <div class="flex items-center gap-2 mb-3 text-sm font-semibold" :style="{ color: 'var(--el-text-color-primary)', padding: '16px 20px 0' }">
        <span class="inline-block w-1 h-4 rounded" :style="{ background: 'var(--el-color-primary)' }" />
        筛选
      </div>
      <div class="flex items-center gap-3 flex-wrap" :style="{ padding: '0 20px' }">
        <el-select v-model="filters.warehouse_code" clearable filterable placeholder="仓库" class="w-36!" @change="applyFilters">
          <el-option v-for="w in warehouses" :key="w.warehouse_code" :label="w.warehouse_name" :value="w.warehouse_code" />
        </el-select>
        <el-select v-model="filters.product_code" clearable filterable placeholder="产品编码" class="w-36!" @change="applyFilters">
          <el-option v-for="p in productOptions" :key="p.product_code" :label="p.product_code" :value="p.product_code" />
        </el-select>
        <el-select v-model="filters.product_name" clearable filterable placeholder="产品名称" class="w-40!" @change="applyFilters">
          <el-option v-for="p in productNameOptions" :key="p.product_name" :label="p.product_name" :value="p.product_name" />
        </el-select>
        <el-select v-model="filters.product_model" clearable filterable placeholder="产品型号" class="w-40!" @change="applyFilters">
          <el-option v-for="p in productModelOptions" :key="p.product_model" :label="p.product_model" :value="p.product_model" />
        </el-select>
        <el-select v-model="filters.alert" clearable placeholder="库存预警" class="w-32!" @change="applyFilters">
          <el-option label="低库存" value="low" />
          <el-option label="高库存" value="high" />
          <el-option label="正常" value="normal" />
          <el-option label="零库存" value="zero" />
        </el-select>
        <el-button type="primary" :loading="loading" @click="applyFilters">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <!-- 筛选标签 -->
      <div v-if="filterTags.length" class="flex items-center gap-1 flex-wrap" :style="{ padding: '12px 20px 0' }">
        <span class="text-xs" :style="{ color: 'var(--el-text-color-secondary)' }">筛选:</span>
        <el-tag v-for="t in filterTags" :key="t.key" closable effect="plain" size="small" @close="clearFilterTag(t)">{{ t.label }}</el-tag>
        <el-button type="primary" link size="small" @click="resetFilters">清除全部</el-button>
      </div>

      <!-- 底部计数 -->
      <div class="flex items-center" :style="{ padding: '12px 20px', marginTop: filterTags.length ? '0' : '8px', borderTop: '1px solid var(--el-border-color-lighter)' }">
        <span class="text-xs" :style="{ color: 'var(--el-text-color-secondary)' }">
          共 <strong :style="{ color: 'var(--el-text-color-primary)' }">{{ pagination.total }}</strong> 条库存记录
        </span>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <PureTableBar title="库存管理" :columns="columns" storage-key="StockList" @refresh="onSearch">
      <template v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }">
        <pure-table
          @header-dragend="(newWidth, _oldWidth, col) => onColumnResize(col.label || col.property, newWidth)"
          row-key="id"
          border
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="left"
         
          :loading="loading"
          :size="size"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="pagination"
          :header-cell-style="headerCellStyle"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #empty>
            <EmptyState title="暂无库存数据" description="调整筛选条件或导入期初库存" />
          </template>
          <template #stock_weight="{ row }">{{ formatStockWeight(row.stock_weight) }}</template>
          <template #min_alert_weight="{ row }">
            <el-button v-if="row.min_alert_weight != null" link type="primary" size="small" @click="openAlertEdit(row)">{{ formatStockWeight(row.min_alert_weight) }}</el-button>
            <el-button v-else link type="primary" size="small" @click="openAlertEdit(row)">点击设置</el-button>
          </template>
          <template #max_alert_weight="{ row }">
            <el-button v-if="row.max_alert_weight != null" link type="primary" size="small" @click="openAlertEdit(row)">{{ formatStockWeight(row.max_alert_weight) }}</el-button>
            <el-button v-else link type="primary" size="small" @click="openAlertEdit(row)">点击设置</el-button>
          </template>
          <template #alert_status="{ row }">
            <el-tag :type="alertTagType(row)" effect="plain" size="small">{{ alertStatus(row) }}</el-tag>
          </template>
          <template #operation="{ row }">
            <el-button link type="primary" size="small" @click="openJournal(row)">流水</el-button>
            <el-button link type="warning" size="small" @click="openAdjust(row)">调整</el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- ==================== 流水弹窗 ==================== -->
    <el-dialog v-model="journalVisible" :title="`库存流水 — ${journalProduct}`" width="1000px" destroy-on-close @close="journalList = []">
      <div class="mb-3"><el-button size="small" @click="handleJournalExport">导出流水</el-button></div>
      <pure-table :key="tableRefreshKey" @header-dragend="(newWidth, _oldWidth, col) => onColumnResize(col.label || col.property, newWidth)" row-key="id" border align-whole="left" :loading="journalLoading" :data="journalList" :columns="journalColumns" :pagination="{ total: journalTotal, pageSize: journalPageSize, currentPage: journalPage, background: true }" :header-cell-style="headerCellStyle" @page-current-change="onJournalPageChange">
        <template #business_type="{ row }">{{ businessTypeLabel(row.business_type) }}</template>
        <template #change_weight="{ row }">{{ formatStockWeight(row.change_weight) }}</template>
        <template #before_weight="{ row }">{{ formatStockWeight(row.before_weight) }}</template>
        <template #after_weight="{ row }">{{ formatStockWeight(row.after_weight) }}</template>
        <template #create_time="{ row }">{{ formatTime(row.create_time) }}</template>
      </pure-table>
    </el-dialog>

    <!-- 预警值编辑 -->
    <el-dialog v-model="alertEditVisible" title="设置预警值" width="400px" destroy-on-close>
      <div class="mb-3 text-gray-500">商品：{{ alertEditRow.product_code }} {{ alertEditRow.product_name }}</div>
      <div class="mb-3 text-gray-500">仓库：{{ alertEditRow.warehouse_name }}</div>
      <el-form label-width="120px">
        <el-form-item label="预警下限(吨)">
          <el-input-number v-model="alertEditForm.min_alert_weight" :min="0" :step="0.0001" :precision="4" class="w-full!" placeholder="留空表示不设下限" />
        </el-form-item>
        <el-form-item label="预警上限(吨)">
          <el-input-number v-model="alertEditForm.max_alert_weight" :min="0" :step="0.0001" :precision="4" class="w-full!" placeholder="留空表示不设上限" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="alertEditVisible = false">取消</el-button>
        <el-button type="primary" :loading="alertEditSaving" @click="saveAlertEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 库存调整 -->
    <el-dialog v-model="adjustVisible" title="调整库存" width="460px" destroy-on-close>
      <div class="mb-4 text-gray-500">商品：{{ adjustRow.product_code }} {{ adjustRow.product_name }} &nbsp;|&nbsp; 仓库：{{ adjustRow.warehouse_name }}</div>
      <div class="mb-4 text-gray-500">当前库存：{{ adjustRow.stock_qty }} 件，{{ Number(adjustRow.stock_weight).toFixed(4) }} 吨</div>
      <el-form label-width="120px">
        <el-form-item label="调整件数">
          <el-input-number v-model="adjustForm.change_qty" :step="1" class="w-full!" placeholder="正数增加、负数减少" />
        </el-form-item>
        <el-form-item label="调整吨位">
          <el-input-number v-model="adjustForm.change_weight" :step="0.0001" :precision="4" class="w-full!" placeholder="正数增加、负数减少" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="adjustForm.remark" placeholder="调整原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjustSaving" @click="saveAdjust">确认调整</el-button>
      </template>
    </el-dialog>

    <!-- 期初库存导入 -->
    <el-dialog v-model="importVisible" title="期初库存导入" width="550px" destroy-on-close>
      <div class="mb-4"><el-button @click="downloadStockTemplate">下载导入模板</el-button></div>
      <el-upload :auto-upload="false" :limit="1" accept=".xlsx,.xls" drag :on-change="onImportFileChange" :on-remove="onImportFileRemove">
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">将 Excel 文件拖到此处，或<em>点击上传</em></div>
        <template #tip><div class="el-upload__tip">仅支持 .xlsx/.xls 格式，大小不超过 5MB</div></template>
      </el-upload>
      <div v-if="importResult" class="mt-4">
        <el-alert :title="`导入完成：成功 ${importResult.successCount} 条，失败 ${importResult.failCount} 条`" :type="importResult.failCount > 0 ? 'warning' : 'success'" :closable="false" />
        <div v-if="importResult.errors?.length" class="mt-2 max-h-50 overflow-y-auto">
          <div v-for="(e, i) in importResult.errors" :key="i" class="text-red-500 text-sm py-0.5">{{ e }}</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="importVisible = false">关闭</el-button>
        <el-button type="primary" :loading="importing" :disabled="!importFile" @click="doStockImport">开始导入</el-button>
      </template>
    </el-dialog>
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

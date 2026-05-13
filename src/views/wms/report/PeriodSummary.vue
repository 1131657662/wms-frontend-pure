<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import { fetchAllListPages } from "@/utils/fetchAllListPages";
import { responseList } from "@/utils/responseList";
import Calendar from "~icons/ri/calendar-2-line";
import OfficeBuilding from "~icons/ep/office-building";
import Search from "~icons/ep/search";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";
import DataAnalysis from "~icons/ep/data-analysis";
import Box from "~icons/ep/box";
import Filter from "~icons/ep/filter";

defineOptions({ name: "PeriodSummary" });

const allData = ref<any[]>([]);
const tableData = ref<any[]>([]);
const loading = ref(false);
const exporting = ref(false);
const warehouses = ref<any[]>([]);
const filter = reactive({ dateRange: [] as string[], warehouse_code: "" });
const defaultFilter = () => ({ dateRange: [], warehouse_code: "" });
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-PeriodSummary")) || 20,
  currentPage: 1,
  background: true
});

const shortcuts = [
  {
    text: "今天",
    value: () => {
      const d = new Date();
      return [d, d];
    }
  },
  {
    text: "本周",
    value: () => {
      const d = new Date();
      const day = d.getDay() || 7;
      const start = new Date(d);
      start.setDate(d.getDate() - day + 1);
      return [start, d];
    }
  },
  {
    text: "本月",
    value: () => {
      const d = new Date();
      return [new Date(d.getFullYear(), d.getMonth(), 1), d];
    }
  },
  {
    text: "近30天",
    value: () => {
      const d = new Date();
      const start = new Date(d);
      start.setDate(d.getDate() - 30);
      return [start, d];
    }
  }
];

const columns: any[] = [
  { label: "仓库", prop: "warehouse_name", minWidth: 120, align: "left" },
  { label: "商品编码", prop: "product_code", minWidth: 110, align: "left" },
  { label: "商品名称", prop: "product_name", minWidth: 120, align: "left" },
  { label: "型号", prop: "product_model", minWidth: 100, align: "left" },
  { label: "期初数量", prop: "begin_qty", minWidth: 90, align: "right" },
  {
    label: "期初重量(吨)",
    prop: "begin_weight",
    slot: "begin_weight",
    minWidth: 130,
    align: "right"
  },
  { label: "入库数量", prop: "in_qty", minWidth: 90, align: "right" },
  {
    label: "入库重量(吨)",
    prop: "in_weight",
    slot: "in_weight",
    minWidth: 120,
    align: "right"
  },
  { label: "出库数量", prop: "out_qty", minWidth: 90, align: "right" },
  {
    label: "出库重量(吨)",
    prop: "out_weight",
    slot: "out_weight",
    minWidth: 120,
    align: "right"
  },
  { label: "期末数量", prop: "end_qty", minWidth: 90, align: "right" },
  {
    label: "期末重量(吨)",
    prop: "end_weight",
    slot: "end_weight",
    minWidth: 130,
    align: "right"
  }
];

function applyPagination() {
  pagination.total = allData.value.length;
  const start = (pagination.currentPage - 1) * pagination.pageSize;
  tableData.value = allData.value.slice(start, start + pagination.pageSize);
}

async function fetchData() {
  loading.value = true;
  try {
    const params: any = {};
    if (filter.dateRange && filter.dateRange.length === 2) {
      params.startDate = filter.dateRange[0];
      params.endDate = filter.dateRange[1];
    }
    if (filter.warehouse_code) params.warehouse_code = filter.warehouse_code;
    const res = await api.get("/report/period-summary", { params });
    allData.value = responseList(res.data);
    pagination.currentPage = 1;
    applyPagination();
  } finally {
    loading.value = false;
  }
}

function search() {
  pagination.currentPage = 1;
  fetchData();
}
function reset() {
  Object.assign(filter, defaultFilter());
}
function onPageChange(p: number) {
  pagination.currentPage = p;
  applyPagination();
}
function onPageSizeChange(s: number) {
  localStorage.setItem("page-size-PeriodSummary", String(s));
  pagination.pageSize = s;
  pagination.currentPage = 1;
  applyPagination();
}

const hasAnyFilter = computed(
  () => filter.dateRange?.length === 2 || !!filter.warehouse_code
);
const statsCards = computed(() => [
  {
    label: "总记录数",
    value: pagination.total || tableData.value.length,
    color: "var(--el-color-primary)",
    icon: DataAnalysis
  },
  { label: "本页", value: tableData.value.length, color: "#67c23a", icon: Box },
  {
    label: "筛选",
    value:
      (filter.dateRange?.length === 2 ? 1 : 0) +
      (filter.warehouse_code ? 1 : 0),
    color: "var(--el-color-info)",
    icon: Filter
  }
]);
const exportFileName = computed(() => {
  const p: string[] = ["收发存汇总表"];
  if (filter.dateRange?.length === 2)
    p.push(`${filter.dateRange[0]}~${filter.dateRange[1]}`);
  return p.join("_") + ".xlsx";
});

async function exportData() {
  if (!hasAnyFilter.value) {
    ElMessage.warning("为保证系统性能，请先设置筛选条件后再导出！");
    return;
  }
  exporting.value = true;
  try {
    const params: any = {};
    if (filter.dateRange && filter.dateRange.length === 2) {
      params.startDate = filter.dateRange[0];
      params.endDate = filter.dateRange[1];
    }
    if (filter.warehouse_code) params.warehouse_code = filter.warehouse_code;
    const res = await api.get("/report/period-summary/export", {
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

onMounted(async () => {
  warehouses.value = (await fetchAllListPages("/warehouse/list", {})) as any[];
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
      <div class="flex items-center gap-3 flex-wrap">
        <el-form :inline="true" class="mb-0!">
          <el-form-item label="日期范围" class="mb-0!">
            <el-date-picker
              v-model="filter.dateRange"
              type="daterange"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              :prefix-icon="useRenderIcon(Calendar)"
              :shortcuts="shortcuts"
              class="w-60!"
            />
          </el-form-item>
          <el-form-item label="仓库" class="mb-0!">
            <el-select
              v-model="filter.warehouse_code"
              clearable
              placeholder="请选择仓库"
              :prefix-icon="useRenderIcon(OfficeBuilding)"
              class="w-48!"
            >
              <el-option
                v-for="w in warehouses"
                :key="w.warehouse_code"
                :label="w.warehouse_name"
                :value="w.warehouse_code"
              />
            </el-select>
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
            @click="reset"
            >重置</el-button
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
      title="收发存汇总表"
      :columns="columns"
      storage-key="PeriodSummary"
      @refresh="search"
    >
      <template
        v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }"
      >
        <pure-table
          :key="tableRefreshKey"
          row-key="product_code"
          border
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="left"
          stripe
          :loading="loading"
          :size="size"
          :data="tableData"
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
              title="暂无收发存汇总数据"
              description="请设置筛选条件后点击查询"
            />
          </template>
          <template #begin_weight="{ row }">{{
            Number(row.begin_weight || 0).toFixed(4)
          }}</template>
          <template #in_weight="{ row }">{{
            Number(row.in_weight || 0).toFixed(4)
          }}</template>
          <template #out_weight="{ row }">{{
            Number(row.out_weight || 0).toFixed(4)
          }}</template>
          <template #end_weight="{ row }">{{
            Number(row.end_weight || 0).toFixed(4)
          }}</template>
        </pure-table>
      </template>
    </PureTableBar>
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

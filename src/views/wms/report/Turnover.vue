<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import Calendar from "~icons/ri/calendar-2-line";
import OfficeBuilding from "~icons/ep/office-building";
import Search from "~icons/ep/search";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";
import RefreshRight from "~icons/ep/refresh-right";
import Sort from "~icons/ep/sort";
import DataLine from "~icons/ep/data-line";

defineOptions({ name: "Turnover" });

const dateRange = ref<string[]>([]);
const filter = reactive({ warehouse_code: "" });
const allData = ref<any[]>([]);
const tableData = ref<any[]>([]);
const loading = ref(false);
const exporting = ref(false);
const warehouses = ref<any[]>([]);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-Turnover")) || 20,
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
  { type: "index", label: "#", width: 50, align: "center", fixed: "left" },
  { label: "商品编码", prop: "product_code", minWidth: 120, align: "left" },
  { label: "商品名称", prop: "product_name", minWidth: 120, align: "left" },
  { label: "型号", prop: "product_model", minWidth: 100, align: "left" },
  { label: "出库数量", prop: "outbound_qty", minWidth: 100, align: "right" },
  {
    label: "出库重量(吨)",
    prop: "outbound_weight",
    slot: "outbound_weight",
    minWidth: 130,
    align: "right"
  },
  { label: "当前库存数量", prop: "current_qty", minWidth: 120, align: "right" },
  {
    label: "当前库存重量(吨)",
    prop: "current_weight",
    slot: "current_weight",
    minWidth: 140,
    align: "right"
  },
  { label: "周转率", prop: "turnover", slot: "turnover", minWidth: 140, align: "right" }
];

function turnoverColor(val: number): string {
  if (val > 0.5) return "var(--el-color-success)";
  if (val > 0.3) return "var(--el-color-warning)";
  if (val > 0) return "var(--el-color-danger)";
  return "var(--el-color-info)";
}

function turnoverStatus(val: number): string {
  if (val > 0.5) return "正常";
  if (val > 0.3) return "偏低";
  if (val > 0) return "极低";
  return "无周转";
}

function applyPagination() {
  pagination.total = allData.value.length;
  const start = (pagination.currentPage - 1) * pagination.pageSize;
  tableData.value = allData.value.slice(start, start + pagination.pageSize);
}

async function fetchData() {
  if (!dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning("请选择日期范围");
    return;
  }
  loading.value = true;
  try {
    const params: any = {
      startDate: dateRange.value[0],
      endDate: dateRange.value[1]
    };
    if (filter.warehouse_code) params.warehouse_code = filter.warehouse_code;
    const res = await api.get("/report/turnover", { params });
    allData.value = res.data || [];
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
  dateRange.value = [];
  filter.warehouse_code = "";
}
function onPageChange(p: number) {
  pagination.currentPage = p;
  applyPagination();
}
function onPageSizeChange(s: number) {
    localStorage.setItem("page-size-Turnover", String(s));
  pagination.pageSize = s;
  pagination.currentPage = 1;
  applyPagination();
}

const hasAnyFilter = computed(
  () => dateRange.value?.length === 2 || !!filter.warehouse_code
);
const statsCards = computed(() => [
  { label: "总记录数", value: pagination.total || tableData.value.length, color: "var(--el-color-primary)", icon: RefreshRight },
  { label: "本页", value: tableData.value.length, color: "#67c23a", icon: Sort },
  { label: "筛选", value: (dateRange.value?.length === 2 ? 1 : 0) + (filter.warehouse_code ? 1 : 0), color: "var(--el-color-info)", icon: DataLine }
]);
const exportFileName = computed(() => {
  const p: string[] = ["商品周转率统计"];
  if (dateRange.value?.length === 2)
    p.push(`${dateRange.value[0]}~${dateRange.value[1]}`);
  return p.join("_") + ".xlsx";
});

async function exportData() {
  if (!hasAnyFilter.value) {
    ElMessage.warning("为保证系统性能，请先设置筛选条件后再导出！");
    return;
  }
  exporting.value = true;
  try {
    const params: any = {
      startDate: dateRange.value[0],
      endDate: dateRange.value[1]
    };
    if (filter.warehouse_code) params.warehouse_code = filter.warehouse_code;
    const res = await api.get("/report/turnover/export", {
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

async function fetchWarehouses() {
  const res = await api.get("/warehouse/list", { params: { pageSize: 999 } });
  warehouses.value = res.data.list || [];
}

onMounted(fetchWarehouses);
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
        <div class="flex items-center justify-center rounded-lg" :style="{ width: '40px', height: '40px', background: card.color + '15', color: card.color }">
          <el-icon :size="20"><component :is="useRenderIcon(card.icon)" /></el-icon>
        </div>
        <div>
          <div class="text-xs" :style="{ color: 'var(--el-text-color-secondary)' }">{{ card.label }}</div>
          <div class="text-xl font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">{{ card.value }}</div>
        </div>
      </div>
    </div>

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
        <el-form :inline="true" class="mb-0!">
          <el-form-item label="日期范围" class="mb-0!">
            <el-date-picker
              v-model="dateRange"
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

    <PureTableBar title="商品周转率统计" :columns="columns" storage-key="Turnover" @refresh="search">
      <template v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }">
        <pure-table :key="tableRefreshKey"
          @header-dragend="(newWidth, _oldWidth, col) => onColumnResize(col.label || col.property, newWidth)"
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
          @page-size-change="onPageSizeChange"
          @page-current-change="onPageChange"
        >
          <template #empty>
            <EmptyState title="暂无周转率数据" description="请选择日期范围后点击查询" />
          </template>
          <template #outbound_weight="{ row }">{{
            Number(row.outbound_weight || 0).toFixed(4)
          }}</template>
          <template #current_weight="{ row }">{{
            Number(row.current_weight || 0).toFixed(4)
          }}</template>
          <template #turnover="{ row }">
            <div class="flex items-center gap-2">
              <el-progress
                :percentage="Math.min((row.turnover || 0) * 100, 100)"
                :stroke-width="6"
                :color="turnoverColor(row.turnover || 0)"
                :show-text="false"
                class="w-14!"
              />
              <span
                class="text-xs font-mono whitespace-nowrap"
                :style="{ color: turnoverColor(row.turnover || 0) }"
                >{{ (row.turnover || 0).toFixed(2) }}</span
              >
              <el-tag
                effect="plain"
                :type="
                  row.turnover > 0.5
                    ? 'success'
                    : row.turnover > 0.3
                      ? 'warning'
                      : row.turnover > 0
                        ? 'danger'
                        : 'info'
                "
                size="small"
                class="ml-1"
                >{{ turnoverStatus(row.turnover || 0) }}</el-tag
              >
            </div>
          </template>
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

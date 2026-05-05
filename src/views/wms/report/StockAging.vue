<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import OfficeBuilding from "~icons/ep/office-building";
import Clock from "~icons/ep/clock";
import Search from "~icons/ep/search";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";
import Timer from "~icons/ep/timer";
import Filter from "~icons/ep/filter";

defineOptions({ name: "StockAging" });

const allData = ref<any[]>([]);
const tableData = ref<any[]>([]);
const loading = ref(false);
const exporting = ref(false);
const warehouses = ref<any[]>([]);
const filter = reactive({
  warehouse_code: "",
  product_code: "",
  aging_range: ""
});
const defaultFilter = () => ({
  warehouse_code: "",
  product_code: "",
  aging_range: ""
});
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-StockAging")) || 20,
  currentPage: 1,
  background: true
});

const columns: any[] = [
  { label: "仓库", prop: "warehouse_name", minWidth: 120, align: "left" },
  { label: "商品编码", prop: "product_code", minWidth: 110, align: "left" },
  { label: "商品名称", prop: "product_name", minWidth: 120, align: "left" },
  { label: "型号", prop: "product_model", minWidth: 100, align: "left" },
  { label: "当前库存数量", prop: "current_qty", minWidth: 120, align: "right" },
  {
    label: "当前库存重量(吨)",
    prop: "current_weight",
    slot: "current_weight",
    minWidth: 150,
    align: "right"
  },
  {
    label: "最后入库日期",
    prop: "last_inbound_date",
    slot: "last_inbound_date",
    minWidth: 130,
    align: "left"
  },
  {
    label: "库龄(天)",
    prop: "age_days",
    minWidth: 100,
    align: "right",
    sortable: true
  },
  { label: "库龄区间", prop: "aging_range", slot: "aging_range", minWidth: 110, align: "center" }
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
    if (filter.warehouse_code) params.warehouse_code = filter.warehouse_code;
    if (filter.product_code) params.product_code = filter.product_code;
    if (filter.aging_range) params.aging_range = filter.aging_range;
    const res = await api.get("/report/stock-aging", { params });
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
  Object.assign(filter, defaultFilter());
}
function onPageChange(p: number) {
  pagination.currentPage = p;
  applyPagination();
}
function onPageSizeChange(s: number) {
    localStorage.setItem("page-size-StockAging", String(s));
  pagination.pageSize = s;
  pagination.currentPage = 1;
  applyPagination();
}

const hasAnyFilter = computed(
  () => !!filter.warehouse_code || !!filter.product_code || !!filter.aging_range
);
const statsCards = computed(() => [
  { label: "总记录数", value: pagination.total || tableData.value.length, color: "var(--el-color-primary)", icon: Timer },
  { label: "本页", value: tableData.value.length, color: "#67c23a", icon: Clock },
  { label: "筛选", value: (filter.warehouse_code ? 1 : 0) + (filter.product_code ? 1 : 0) + (filter.aging_range ? 1 : 0), color: "var(--el-color-info)", icon: Filter }
]);
function formatTime(t: string) {
  if (!t) return "—";
  return new Date(t).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).replace(/\//g, "-");
}

const exportFileName = computed(() => {
  const p: string[] = ["库龄分析报表"];
  if (filter.aging_range) p.push(filter.aging_range);
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
    if (filter.warehouse_code) params.warehouse_code = filter.warehouse_code;
    if (filter.product_code) params.product_code = filter.product_code;
    if (filter.aging_range) params.aging_range = filter.aging_range;
    const res = await api.get("/report/stock-aging/export", {
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
  const res = await api.get("/warehouse/list", { params: { pageSize: 999 } });
  warehouses.value = res.data.list || [];
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
          <el-form-item label="仓库" class="mb-0!">
            <el-select
              v-model="filter.warehouse_code"
              clearable
              placeholder="请选择仓库"
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
          <el-form-item label="商品编码" class="mb-0!">
            <el-input
              v-model="filter.product_code"
              clearable
              placeholder="模糊查询"
              class="w-40!"
            />
          </el-form-item>
          <el-form-item label="库龄区间" class="mb-0!">
            <el-select
              v-model="filter.aging_range"
              clearable
              placeholder="请选择"
              :prefix-icon="useRenderIcon(Clock)"
              class="w-32!"
            >
              <el-option label="0-30天" value="0-30天" />
              <el-option label="31-60天" value="31-60天" />
              <el-option label="61-90天" value="61-90天" />
              <el-option label="91天以上" value="91天以上" />
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

    <PureTableBar title="库龄分析报表" :columns="columns" storage-key="StockAging" @refresh="search">
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
            <EmptyState title="暂无库龄分析数据" description="请设置筛选条件后点击查询" />
          </template>
          <template #current_weight="{ row }">{{
            Number(row.current_weight || 0).toFixed(4)
          }}</template>
          <template #last_inbound_date="{ row }">{{
            formatTime(row.last_inbound_date)
          }}</template>
          <template #aging_range="{ row }">
            <el-tag
              effect="plain"
              :type="
                row.aging_range === '0-30天'
                  ? 'success'
                  : row.aging_range === '31-60天'
                    ? 'warning'
                    : row.aging_range === '61-90天'
                      ? 'danger'
                      : 'info'
              "
              size="small"
              >{{ row.aging_range }}</el-tag
            >
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

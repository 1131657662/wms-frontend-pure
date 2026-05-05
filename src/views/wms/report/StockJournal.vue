<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { ElMessage } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import Calendar from "~icons/ri/calendar-2-line";
import OfficeBuilding from "~icons/ep/office-building";
import Tickets from "~icons/ep/tickets";
import Search from "~icons/ep/search";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";
import DocumentCopy from "~icons/ep/document-copy";
import List from "~icons/ep/list";
import Filter from "~icons/ep/filter";

defineOptions({ name: "StockJournal" });

const list = ref<any[]>([]);
const loading = ref(false);
const exporting = ref(false);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-StockJournal")) || 20,
  currentPage: 1,
  background: true
});
const filter = reactive({
  dateRange: [] as string[],
  warehouse_name: "",
  product_code: "",
  business_type: ""
});
const defaultFilter = () => ({
  dateRange: [],
  warehouse_name: "",
  product_code: "",
  business_type: ""
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
  { label: "日期时间", prop: "create_time", slot: "create_time", minWidth: 160, align: "left" },
  { label: "仓库", prop: "warehouse_name", minWidth: 120, align: "left" },
  { label: "商品编码", prop: "product_code", minWidth: 110, align: "left" },
  { label: "商品名称", prop: "product_name", minWidth: 120, align: "left" },
  { label: "型号", prop: "product_model", minWidth: 100, align: "left" },
  { label: "业务类型", prop: "business_type", slot: "business_type", width: 90, align: "center" },
  {
    label: "关联单号",
    prop: "order_no",
    minWidth: 170,
    align: "left",
    showOverflowTooltip: true
  },
  { label: "变化数量", prop: "change_qty", minWidth: 90, align: "right" },
  {
    label: "变化重量(吨)",
    prop: "change_weight",
    slot: "change_weight",
    minWidth: 120,
    align: "right"
  },
  { label: "变化前数量", prop: "before_qty", minWidth: 100, align: "right" },
  { label: "变化前重量", prop: "before_weight", slot: "before_weight", minWidth: 120, align: "right" },
  { label: "变化后数量", prop: "after_qty", minWidth: 100, align: "right" },
  { label: "变化后重量", prop: "after_weight", slot: "after_weight", minWidth: 120, align: "right" },
  {
    label: "备注",
    prop: "remark",
    minWidth: 120,
    align: "left",
    showOverflowTooltip: true
  }
];

async function fetchData() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    };
    if (filter.dateRange && filter.dateRange.length === 2) {
      params.startDate = filter.dateRange[0];
      params.endDate = filter.dateRange[1];
    }
    ["warehouse_name", "product_code", "business_type"].forEach(k => {
      if ((filter as any)[k]) params[k] = (filter as any)[k];
    });
    const res = await api.get("/report/stock-journal", { params });
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
function reset() {
  Object.assign(filter, defaultFilter());
  pagination.currentPage = 1;
  fetchData();
}
function onPageChange(p: number) {
  pagination.currentPage = p;
  fetchData();
}
function onPageSizeChange(s: number) {
    localStorage.setItem("page-size-StockJournal", String(s));
  pagination.pageSize = s;
  pagination.currentPage = 1;
  fetchData();
}

const hasAnyFilter = computed(
  () =>
    filter.dateRange?.length === 2 ||
    !!filter.warehouse_name ||
    !!filter.product_code ||
    !!filter.business_type
);
const statsCards = computed(() => [
  { label: "总记录数", value: pagination.total || list.value.length, color: "var(--el-color-primary)", icon: DocumentCopy },
  { label: "本页", value: list.value.length, color: "#67c23a", icon: List },
  { label: "筛选", value: (filter.dateRange?.length === 2 ? 1 : 0) + (filter.warehouse_name ? 1 : 0) + (filter.product_code ? 1 : 0) + (filter.business_type ? 1 : 0), color: "var(--el-color-info)", icon: Filter }
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
  const p: string[] = ["进销存台账"];
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
    ["warehouse_name", "product_code", "business_type"].forEach(k => {
      if ((filter as any)[k]) params[k] = (filter as any)[k];
    });
    const res = await api.get("/report/stock-journal/export", {
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
              v-model="filter.dateRange"
              type="daterange"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              :prefix-icon="useRenderIcon(Calendar)"
              :shortcuts="shortcuts"
              class="w-58!"
            />
          </el-form-item>
          <el-form-item label="仓库名称" class="mb-0!">
            <el-input
              v-model="filter.warehouse_name"
              clearable
              placeholder="模糊查询"
              :prefix-icon="useRenderIcon(OfficeBuilding)"
              class="w-40!"
            />
          </el-form-item>
          <el-form-item label="商品编码" class="mb-0!">
            <el-input
              v-model="filter.product_code"
              clearable
              placeholder="模糊查询"
              class="w-40!"
            />
          </el-form-item>
          <el-form-item label="业务类型" class="mb-0!">
            <el-select
              v-model="filter.business_type"
              clearable
              placeholder="请选择"
              :prefix-icon="useRenderIcon(Tickets)"
              class="w-32!"
            >
              <el-option label="入库" value="inbound" />
              <el-option label="出库" value="outbound" />
              <el-option label="盘点" value="check" />
              <el-option label="初始化" value="init" />
              <el-option label="导入" value="import" />
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

    <PureTableBar title="进销存台账" :columns="columns" storage-key="StockJournal" @refresh="search">
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
            <EmptyState title="暂无进销存台账数据" description="请设置筛选条件后点击查询" />
          </template>
          <template #create_time="{ row }">{{
            formatTime(row.create_time)
          }}</template>
          <template #business_type="{ row }">
            <el-tag
              effect="plain"
              :type="
                row.business_type === '入库'
                  ? 'success'
                  : row.business_type === '出库'
                    ? 'danger'
                    : 'info'
              "
              size="small"
              >{{ row.business_type }}</el-tag
            >
          </template>
          <template #change_weight="{ row }">{{
            Number(row.change_weight || 0).toFixed(4)
          }}</template>
          <template #before_weight="{ row }">{{
            Number(row.before_weight || 0).toFixed(4)
          }}</template>
          <template #after_weight="{ row }">{{
            Number(row.after_weight || 0).toFixed(4)
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

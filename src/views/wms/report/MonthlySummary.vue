<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { useDark, useECharts } from "@pureadmin/utils";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import Calendar from "~icons/ri/calendar-2-line";
import Download from "~icons/ep/download";
import TrendCharts from "~icons/ep/trend-charts";
import Document from "~icons/ep/document";
import Filter from "~icons/ep/filter";
import Search from "~icons/ep/search";
import Refresh from "~icons/ep/refresh";

defineOptions({ name: "MonthlySummary" });

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const year = ref(new Date().getFullYear().toString());
const tableData = ref<any[]>([]);
const loading = ref(false);
const exporting = ref(false);

const chartRef = ref<HTMLElement>();
const { setOptions } = useECharts(chartRef, { theme });

const columns: any[] = [
  { label: "月份", prop: "month", slot: "month", width: 80, align: "center", fixed: "left" },
  { label: "入库单数", prop: "inbound_count", minWidth: 100, align: "right" },
  {
    label: "入库重量(吨)",
    prop: "inbound_weight",
    slot: "inbound_weight",
    minWidth: 130,
    align: "right"
  },
  { label: "入库数量", prop: "inbound_qty", minWidth: 100, align: "right" },
  { label: "出库单数", prop: "outbound_count", minWidth: 100, align: "right" },
  {
    label: "出库重量(吨)",
    prop: "outbound_weight",
    slot: "outbound_weight",
    minWidth: 130,
    align: "right"
  },
  { label: "出库数量", prop: "outbound_qty", minWidth: 100, align: "right" },
  { label: "净入库重量(吨)", prop: "net_weight", slot: "net_weight", minWidth: 130, align: "right" }
];

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get("/report/monthly-summary", {
      params: { year: year.value }
    });
    tableData.value = res.data;
    await nextTick();
    renderChart();
  } finally {
    loading.value = false;
  }
}

function renderChart() {
  const months = tableData.value.map(d => d.month + "月");
  const inbound = tableData.value.map(d => d.inbound_weight);
  const outbound = tableData.value.map(d => d.outbound_weight);
  setOptions({
    color: ["#409EFF", "#67C23A"],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v: number) => v.toFixed(4) + " 吨"
    },
    legend: {
      data: ["入库重量", "出库重量"],
      bottom: 0,
      textStyle: { color: "#909399", fontSize: 13 }
    },
    grid: { top: 20, left: 50, right: 20, bottom: 40 },
    xAxis: {
      type: "category",
      data: months,
      axisLabel: { fontSize: 12 },
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 12 },
      splitLine: { show: false }
    },
    series: [
      {
        name: "入库重量",
        type: "bar",
        barWidth: 16,
        barGap: "30%",
        itemStyle: { borderRadius: [8, 8, 0, 0] },
        data: inbound
      },
      {
        name: "出库重量",
        type: "bar",
        barWidth: 16,
        itemStyle: { borderRadius: [8, 8, 0, 0] },
        data: outbound
      }
    ]
  });
}

function getSummary({ columns, data }: any) {
  const sums: any[] = [];
  columns.forEach((_col: any, idx: number) => {
    if (idx === 0) sums[idx] = "合计";
    else
      sums[idx] = data.reduce(
        (acc: number, row: any) =>
          acc + (Number(row[columns[idx].property]) || 0),
        0
      );
  });
  return sums;
}

const hasAnyFilter = computed(() => !!year.value);
const statsCards = computed(() => [
  { label: "月度记录数", value: tableData.value.length, color: "var(--el-color-primary)", icon: TrendCharts },
  { label: "本页", value: tableData.value.length, color: "#67c23a", icon: Document },
  { label: "筛选", value: hasAnyFilter.value ? 1 : 0, color: "var(--el-color-info)", icon: Filter }
]);
const exportFileName = computed(() => `${year.value}年月度出入库汇总.xlsx`);

function search() { fetchData(); }
function resetFilter() { year.value = new Date().getFullYear().toString(); }

async function exportData() {
  if (!hasAnyFilter.value) {
    ElMessage.warning("为保证系统性能，请先设置筛选条件后再导出！");
    return;
  }
  exporting.value = true;
  try {
    const res = await api.get("/report/monthly-summary/export", {
      params: { year: year.value },
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

watch(() => year.value, fetchData);
onMounted(fetchData);
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
          <el-form-item label="年度" class="mb-0!">
            <el-date-picker
              v-model="year"
              type="year"
              placeholder="选择年份"
              format="YYYY年"
              value-format="YYYY"
              :prefix-icon="useRenderIcon(Calendar)"
              class="w-40!"
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
            @click="resetFilter"
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

    <div
      class="wms-card mb-4 p-4"
    >
      <div ref="chartRef" class="h-80" />
    </div>

    <PureTableBar
      title="月度出入库汇总"
      :columns="columns"
      storage-key="MonthlySummary"
      @refresh="fetchData"
    >
      <template v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }">
        <pure-table :key="tableRefreshKey"
          @header-dragend="(newWidth, _oldWidth, col) => onColumnResize(col.label || col.property, newWidth)"
          row-key="month"
          border

          stripe
          align-whole="left"
          :loading="loading"
          :size="size"
          :data="tableData"
          :columns="dynamicColumns"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)',
            fontWeight: 600,
            height: '48px'
          }"
          show-summary
          :summary-method="getSummary"
        >
          <template #empty>
            <EmptyState title="暂无月度汇总数据" description="请选择年度后点击查询" />
          </template>
          <template #month="{ row }">{{ row.month }}月</template>
          <template #inbound_weight="{ row }">{{
            Number(row.inbound_weight || 0).toFixed(4)
          }}</template>
          <template #outbound_weight="{ row }">{{
            Number(row.outbound_weight || 0).toFixed(4)
          }}</template>
          <template #net_weight="{ row }">{{
            (
              Number(row.inbound_weight || 0) - Number(row.outbound_weight || 0)
            ).toFixed(4)
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

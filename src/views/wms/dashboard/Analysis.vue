<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import {
  getPieOption,
  getBarOption,
  getLineOption
} from "./components/DashboardCharts";
import StatCard from "./components/StatCard.vue";
import ChartCard from "./components/ChartCard.vue";
import DocTable from "./components/DocTable.vue";

import ArrowDownIcon from "~icons/ri/arrow-down-circle-line";
import ArrowUpIcon from "~icons/ri/arrow-up-circle-line";
import ListCheckIcon from "~icons/ri/list-check";
import AlertIcon from "~icons/ri/information-line";

defineOptions({ name: "DashboardAnalysis" });

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const loading = ref(true);
const days = ref(7);
const panelGroup = ref({ users: 0, messages: 0, moneys: 0, shoppings: 0 });
const pieData = ref<{ name: string; value: number }[]>([]);
const trendData = ref<
  { name: string; inboundWeight: number; outboundWeight: number }[]
>([]);
const lineData = ref<
  { name: string; inboundWeight: number; outboundWeight: number }[]
>([]);
const recentDocs = ref<any[]>([]);

// Extract mini trend data for StatCard sparklines
const inboundTrend = computed(() => trendData.value.map(d => d.inboundWeight));
const outboundTrend = computed(() =>
  trendData.value.map(d => d.outboundWeight)
);

const kpiCards = computed(() => [
  {
    key: "todayInbound",
    label: "今日入库",
    value: panelGroup.value.users,
    decimalPlaces: 4,
    suffix: "吨",
    icon: ArrowDownIcon,
    color: "var(--el-color-primary)",
    trend: inboundTrend.value
  },
  {
    key: "todayOutbound",
    label: "今日出库",
    value: panelGroup.value.messages,
    decimalPlaces: 4,
    suffix: "吨",
    icon: ArrowUpIcon,
    color: "#67c23a",
    trend: outboundTrend.value
  },
  {
    key: "pending",
    label: "待处理",
    value: panelGroup.value.moneys,
    icon: ListCheckIcon,
    color: "#e6a23c"
  },
  {
    key: "lowStock",
    label: "低库存预警",
    value: panelGroup.value.shoppings,
    icon: AlertIcon,
    color: "#f56c6c"
  }
]);

// Charts
const pieChartRef = ref<HTMLDivElement>();
const barChartRef = ref<HTMLDivElement>();
const lineChartRef = ref<HTMLDivElement>();

const { setOptions: setPieOption } = useECharts(pieChartRef, { theme });
const { setOptions: setBarOption } = useECharts(barChartRef, { theme });
const { setOptions: setLineOption } = useECharts(lineChartRef, { theme });

function renderCharts() {
  if (pieData.value.length)
    setPieOption(getPieOption(pieData.value, isDark.value));
  if (trendData.value.length)
    setBarOption(getBarOption(trendData.value, isDark.value));
  if (lineData.value.length)
    setLineOption(getLineOption(lineData.value, isDark.value));
}

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get("/dashboard/analysis", {
      params: { days: days.value }
    });
    const d = res.data;
    panelGroup.value = d.panelGroup ?? panelGroup.value;
    pieData.value = d.pieData ?? [];
    trendData.value = d.trendData ?? [];
    lineData.value = d.lineData ?? [];
    recentDocs.value = d.recentDocs ?? [];
  } catch (e: any) {
    console.error("Dashboard fetch error:", e);
  } finally {
    loading.value = false;
    await nextTick();
    renderCharts();
  }
}

onMounted(fetchData);
watch(days, fetchData);
</script>

<template>
  <div class="analysis-page">
    <!-- KPI Stat Cards -->
    <div class="kpi-grid">
      <StatCard
        v-for="(card, i) in kpiCards"
        :key="card.key"
        v-bind="card"
        :loading="loading"
        :style="{ animationDelay: `${i * 60}ms` }"
      />
    </div>

    <!-- Pie + Bar Charts -->
    <div class="chart-row">
      <ChartCard
        label="OVERVIEW"
        title="出入库吨位分布"
        subtitle="本月各类型吨位占比（不含盘点单）"
        :loading="loading"
        :empty="!pieData.length"
        empty-text="暂无吨位数据"
      >
        <div ref="pieChartRef" style="width: 100%; height: 320px" />
      </ChartCard>

      <ChartCard
        :title="`近 ${days} 天出入库吨位`"
        subtitle="入库 vs 出库（吨）"
        :loading="loading"
        :empty="!trendData.length"
        empty-text="暂无趋势数据"
        show-refresh
        @refresh="fetchData"
      >
        <template #actions>
          <el-radio-group v-model="days" size="small">
            <el-radio-button :value="7">7天</el-radio-button>
            <el-radio-button :value="30">30天</el-radio-button>
          </el-radio-group>
        </template>
        <div ref="barChartRef" style="width: 100%; height: 320px" />
      </ChartCard>
    </div>

    <!-- Monthly Line Chart -->
    <ChartCard
      label="TREND"
      title="近 12 月月度吨位趋势"
      subtitle="入库 vs 出库长期走势（吨）"
      :loading="loading"
      :empty="!lineData.length"
      empty-text="暂无月度数据"
    >
      <div ref="lineChartRef" style="width: 100%; height: 340px" />
    </ChartCard>

    <!-- Recent Documents -->
    <DocTable :data="recentDocs" :loading="loading" />
  </div>
</template>

<style scoped>
.analysis-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-section-gap);
  padding: var(--dash-page-pad);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--dash-gap);
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--dash-gap);
}

/* Entrance animation */
.kpi-grid > * {
  animation: fade-up 0.5s ease backwards;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (width <= 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-row {
    grid-template-columns: 1fr;
  }
}

@media (width <= 768px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";
import api from "@/api/wms";
import { getRadarOption } from "./components/DashboardCharts";
import StatCard from "./components/StatCard.vue";
import ChartCard from "./components/ChartCard.vue";
import WarehouseCard from "./components/WarehouseCard.vue";
import ActivityTimeline from "./components/ActivityTimeline.vue";
import ActiveUserTags from "./components/ActiveUserTags.vue";

import DatabaseIcon from "~icons/ri/database-2-line";
import ListCheckIcon from "~icons/ri/list-check";
import ClockIcon from "~icons/ep/clock";

defineOptions({ name: "DashboardWorkplace" });

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const loading = ref(true);
const total = ref({ project: 0, access: 0, todo: 0 });
const project = ref<any[]>([]);
const dynamics = ref<any[]>([]);
const team = ref<any[]>([]);
const radarData = ref<any[]>([]);

const statCards = computed(() => [
  { key: "product", label: "商品总数", value: total.value.project, icon: DatabaseIcon, color: "var(--el-color-primary)", suffix: " 种" },
  { key: "todayOps", label: "今日操作数", value: total.value.access, icon: ListCheckIcon, color: "#67c23a", suffix: " 次" },
  { key: "todo", label: "待办事项", value: total.value.todo, icon: ClockIcon, color: "#e6a23c", suffix: " 项" }
]);

// Radar chart
const radarChartRef = ref<HTMLDivElement>();
const { setOptions: setRadarOption } = useECharts(radarChartRef, { theme });

function renderCharts() {
  if (radarData.value.length) {
    setRadarOption(getRadarOption(radarData.value, isDark.value));
  }
}

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get("/dashboard/workplace");
    const d = res.data;
    total.value = d.total ?? total.value;
    project.value = d.project ?? [];
    dynamics.value = d.dynamic ?? [];
    team.value = d.team ?? [];
    radarData.value = d.radar ?? [];
    await new Promise((r) => setTimeout(r, 50));
    renderCharts();
  } catch {
    /* silent */
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="workplace-page">
    <!-- Stat Cards -->
    <div class="kpi-grid">
      <StatCard
        v-for="(card, i) in statCards"
        :key="card.key"
        v-bind="card"
        :loading="loading"
        :style="{ animationDelay: `${i * 60}ms` }"
      />
    </div>

    <!-- Warehouse Overview + Radar Chart -->
    <div class="chart-row">
      <ChartCard
        title="仓库概览"
        :subtitle="`${project.length} 个仓库`"
        :loading="loading"
        :empty="!project.length"
        empty-text="暂无启用的仓库"
        class="wh-section"
      >
        <div class="wh-grid">
          <WarehouseCard
            v-for="wh in project"
            :key="wh.name"
            :warehouse="wh"
          />
        </div>
      </ChartCard>

      <ChartCard
        title="运营指标"
        subtitle="个人 vs 团队"
        :loading="loading"
        :empty="!radarData.length"
        empty-text="暂无运营数据"
        show-refresh
        @refresh="fetchData"
      >
        <div ref="radarChartRef" style="width:100%;height:380px" />
      </ChartCard>
    </div>

    <!-- Active Users + Activity Timeline -->
    <div class="bottom-row">
      <ChartCard
        title="活跃用户"
        :subtitle="team.length ? '近30天' : ''"
        :loading="loading"
        :empty="!team.length"
        empty-text="暂无活跃用户"
      >
        <ActiveUserTags :users="team" />
      </ChartCard>

      <ChartCard
        title="最近动态"
        :subtitle="`${dynamics.length} 条`"
        :loading="loading"
        :empty="!dynamics.length"
        empty-text="暂无操作日志"
      >
        <ActivityTimeline :items="dynamics" />
      </ChartCard>
    </div>
  </div>
</template>

<style scoped>

.workplace-page {
  padding: var(--dash-page-pad);
  display: flex;
  flex-direction: column;
  gap: var(--dash-section-gap);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--dash-gap);
}

.chart-row {
  display: grid;
  grid-template-columns: 5fr 3fr;
  gap: var(--dash-gap);
}

.wh-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.bottom-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--dash-gap);
}

/* Entrance animation */
.kpi-grid > * {
  animation: fadeUp 0.5s ease backwards;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsive */
@media (max-width: 1200px) {
  .chart-row { grid-template-columns: 1fr; }
  .bottom-row { grid-template-columns: 1fr; }
  .wh-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .wh-grid { grid-template-columns: 1fr; }
}
</style>

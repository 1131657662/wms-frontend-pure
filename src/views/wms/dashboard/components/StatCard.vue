<script setup lang="ts">
import { computed, type Component } from "vue";
import { ReNormalCountTo } from "@/components/ReCountTo";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import SparkLine from "./SparkLine.vue";

defineOptions({ name: "StatCard" });

const props = withDefaults(defineProps<{
  label: string;
  value: number;
  suffix?: string;
  icon: Component;
  color: string;
  trend?: number[];
  change?: number;
  loading?: boolean;
}>(), {
  suffix: "",
  loading: false
});

const renderedIcon = computed(() => useRenderIcon(props.icon));

function sparkColor() {
  if (props.change === undefined) return props.color;
  return props.change >= 0 ? "var(--dash-sparkline-up)" : "var(--dash-sparkline-down)";
}

function changePrefix() {
  if (props.change === undefined) return "";
  return props.change >= 0 ? "↑" : "↓";
}

function changeClass() {
  if (props.change === undefined) return "";
  return props.change >= 0 ? "change-up" : "change-down";
}
</script>

<template>
  <div class="stat-card" :class="{ 'is-loading': loading }">
    <div class="stat-header">
      <span class="stat-label">{{ label }}</span>
      <span class="stat-icon" :style="{ background: color + '15', color }">
        <component :is="renderedIcon" />
      </span>
    </div>

    <div class="stat-body">
      <template v-if="!loading">
        <div class="stat-value">
          <ReNormalCountTo
            :start-val="0"
            :end-val="value"
            :duration="1200"
            :font-size="'inherit'"
          />
          <span v-if="suffix" class="stat-suffix">{{ suffix }}</span>
        </div>
        <div v-if="trend && trend.length > 1" class="stat-spark">
          <SparkLine :data="trend" :color="sparkColor()" :width="80" :height="24" />
        </div>
        <div v-if="change !== undefined" class="stat-change" :class="changeClass()">
          <span>{{ changePrefix() }} {{ Math.abs(change).toFixed(1) }}%</span>
          <span class="change-vs">vs 昨日</span>
        </div>
      </template>
      <template v-else>
        <div class="skeleton-value" />
        <div class="skeleton-spark" />
      </template>
    </div>
  </div>
</template>

<style scoped>

.stat-card {
  background: var(--dash-card-bg, var(--el-bg-color, #fff));
  border: var(--dash-border);
  border-radius: var(--dash-radius);
  box-shadow: var(--dash-shadow);
  padding: var(--dash-card-pad);
  will-change: transform, box-shadow;
  transform: translateY(0);
  transition: transform 0.1s cubic-bezier(0.4, 0, 1, 1),
              box-shadow 0.1s cubic-bezier(0.4, 0, 1, 1);
  cursor: default;
}
.stat-card:hover {
  transition: transform 0.35s cubic-bezier(0.25, 0.1, 0.1, 1.0),
              box-shadow 0.35s cubic-bezier(0.25, 0.1, 0.1, 1.0);
  transform: translateY(-3px);
  box-shadow: var(--dash-shadow-hover);
  border: var(--dash-border-hover);
}

/* Header */
.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.stat-label {
  font-size: var(--dash-label-size);
  color: var(--el-text-color-secondary);
  font-weight: 500;
  letter-spacing: 0.01em;
  text-transform: uppercase;
}
.stat-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--dash-radius-sm);
  font-size: 20px;
  flex-shrink: 0;
}

/* Value */
.stat-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stat-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: var(--dash-kpi-size);
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1;
  letter-spacing: -0.02em;
}
.stat-suffix {
  font-size: 14px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
  letter-spacing: 0;
}

/* Spark */
.stat-spark {
  height: 24px;
}

/* Change */
.stat-change {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.change-up {
  color: var(--dash-sparkline-up);
}
.change-down {
  color: var(--dash-sparkline-down);
}
.change-vs {
  color: var(--el-text-color-placeholder);
}

/* Skeleton */
.skeleton-value {
  width: 60%;
  height: 32px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-spark {
  width: 80px;
  height: 24px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite 0.2s;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>

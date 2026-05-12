<script setup lang="ts">
import { computed, type Component } from "vue";
import { ReNormalCountTo } from "@/components/ReCountTo";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import SparkLine from "./SparkLine.vue";

defineOptions({ name: "StatCard" });

const props = withDefaults(
  defineProps<{
    label: string;
    value: number;
    suffix?: string;
    icon: Component;
    color: string;
    trend?: number[];
    change?: number;
    loading?: boolean;
    /** 若设置则显示固定小数位，不使用数字滚动动画 */
    decimalPlaces?: number;
  }>(),
  {
    suffix: "",
    loading: false,
    decimalPlaces: undefined
  }
);

const displayDecimal = computed(() =>
  props.decimalPlaces !== undefined && props.decimalPlaces >= 0
    ? Number(props.value ?? 0).toFixed(props.decimalPlaces)
    : null
);

const renderedIcon = computed(() => useRenderIcon(props.icon));

function sparkColor() {
  if (props.change === undefined) return props.color;
  return props.change >= 0
    ? "var(--dash-sparkline-up)"
    : "var(--dash-sparkline-down)";
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
          <template v-if="displayDecimal !== null">
            <span>{{ displayDecimal }}</span>
          </template>
          <ReNormalCountTo
            v-else
            :start-val="0"
            :end-val="value"
            :duration="1200"
            :font-size="'inherit'"
          />
          <span v-if="suffix" class="stat-suffix">{{ suffix }}</span>
        </div>
        <div v-if="trend && trend.length > 1" class="stat-spark">
          <SparkLine
            :data="trend"
            :color="sparkColor()"
            :width="80"
            :height="24"
          />
        </div>
        <div
          v-if="change !== undefined"
          class="stat-change"
          :class="changeClass()"
        >
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
  padding: var(--dash-card-pad);
  cursor: default;
  background: var(--dash-card-bg, var(--el-bg-color, #fff));
  border: var(--dash-border);
  border-radius: var(--dash-radius);
  box-shadow: var(--dash-shadow);
  transform: translateY(0);
  transition:
    transform 0.1s cubic-bezier(0.4, 0, 1, 1),
    box-shadow 0.1s cubic-bezier(0.4, 0, 1, 1);
  will-change: transform, box-shadow;
}

.stat-card:hover {
  border: var(--dash-border-hover);
  box-shadow: var(--dash-shadow-hover);
  transform: translateY(-3px);
  transition:
    transform 0.35s cubic-bezier(0.25, 0.1, 0.1, 1),
    box-shadow 0.35s cubic-bezier(0.25, 0.1, 0.1, 1);
}

/* Header */
.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.stat-label {
  font-size: var(--dash-label-size);
  font-weight: 500;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.01em;
}

.stat-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  border-radius: var(--dash-radius-sm);
}

/* Value */
.stat-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-value {
  display: flex;
  gap: 6px;
  align-items: baseline;
  font-size: var(--dash-kpi-size);
  font-weight: 700;
  line-height: 1;
  color: var(--el-text-color-primary);
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
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
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
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}
</style>

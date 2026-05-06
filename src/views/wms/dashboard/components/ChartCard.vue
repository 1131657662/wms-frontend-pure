<script setup lang="ts">
import { computed } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import RefreshIcon from "~icons/ep/refresh";

defineOptions({ name: "ChartCard" });

defineProps<{
  label?: string;
  title: string;
  subtitle?: string;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  showRefresh?: boolean;
}>();

defineEmits<{
  refresh: [];
}>();

const refreshIcon = computed(() => useRenderIcon(RefreshIcon));
</script>

<template>
  <div class="chart-card">
    <div class="card-head">
      <div class="head-left">
        <span v-if="label" class="head-label">{{ label }}</span>
        <span class="head-title">{{ title }}</span>
        <span v-if="subtitle" class="head-subtitle">{{ subtitle }}</span>
      </div>
      <div class="head-right">
        <slot name="actions" />
        <el-button
          v-if="showRefresh"
          :icon="refreshIcon"
          text
          size="small"
          @click="$emit('refresh')"
        >
          刷新
        </el-button>
      </div>
    </div>

    <div v-show="loading" class="card-loading">
      <el-skeleton :rows="4" animated style="width:100%" />
    </div>
    <div v-show="!loading && empty" class="card-empty">
      <el-empty :image-size="60" :description="emptyText || '暂无数据'" />
    </div>
    <div v-show="!loading && !empty" class="card-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>

.chart-card {
  background: var(--dash-card-bg, var(--el-bg-color, #fff));
  border: var(--dash-border);
  border-radius: var(--dash-radius);
  box-shadow: var(--dash-shadow);
  padding: var(--dash-card-pad);
  will-change: box-shadow;
  transition: box-shadow 0.1s cubic-bezier(0.4, 0, 1, 1);
}
.chart-card:hover {
  transition: box-shadow 0.35s cubic-bezier(0.25, 0.1, 0.1, 1.0);
  box-shadow: var(--dash-shadow-hover);
  border: var(--dash-border-hover);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.head-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.head-label {
  font-size: var(--dash-label-size);
  color: var(--el-text-color-secondary);
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.head-title {
  font-size: var(--dash-title-size);
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.head-subtitle {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}
.head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-loading {
  padding: 20px 0;
}
.card-empty {
  padding: 20px 0;
}
</style>

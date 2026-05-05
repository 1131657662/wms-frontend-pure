<script setup lang="ts">
import { computed } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import DatabaseIcon from "~icons/ri/database-2-line";
import TimeIcon from "~icons/ep/timer";

defineOptions({ name: "WarehouseCard" });

interface Warehouse {
  name: string;
  message: string;
  personal: string;
  skuCount: number;
  pendingCount: number;
  todayCount: number;
  time: string;
}

defineProps<{ warehouse: Warehouse }>();

const dbIcon = computed(() => useRenderIcon(DatabaseIcon));
const tmIcon = computed(() => useRenderIcon(TimeIcon));

function formatTime(t: string) {
  if (!t) return "";
  return t.slice(0, 16).replace("T", " ");
}
</script>

<template>
  <div class="wh-card">
    <div class="wh-top">
      <div class="wh-icon-box">
        <component :is="dbIcon" />
      </div>
      <div class="wh-info">
        <span class="wh-name">{{ warehouse.name }}</span>
        <span class="wh-desc">{{ warehouse.message }}</span>
      </div>
    </div>
    <div class="wh-personal">
      <span>负责人：{{ warehouse.personal }}</span>
    </div>
    <el-divider class="wh-divider" />
    <div class="wh-stats">
      <div class="wh-stat">
        <span class="wh-stat-val" style="color: var(--el-color-primary)">{{ warehouse.skuCount }}</span>
        <span class="wh-stat-label">SKU</span>
      </div>
      <div class="wh-stat">
        <span class="wh-stat-val" style="color: #e6a23c">{{ warehouse.pendingCount }}</span>
        <span class="wh-stat-label">待审核</span>
      </div>
      <div class="wh-stat">
        <span class="wh-stat-val" style="color: #67c23a">{{ warehouse.todayCount }}</span>
        <span class="wh-stat-label">今日</span>
      </div>
    </div>
    <div class="wh-time">
      <component :is="tmIcon" class="time-icon" />
      <span>{{ formatTime(warehouse.time) }}</span>
    </div>
  </div>
</template>

<style scoped>

.wh-card {
  background: var(--dash-card-bg, var(--el-bg-color, #fff));
  border: var(--dash-border);
  border-radius: var(--dash-radius);
  padding: 16px;
  will-change: transform, box-shadow;
  transform: translateY(0);
  transition: transform 0.1s cubic-bezier(0.4, 0, 1, 1);
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.wh-card:hover {
  transition: transform 0.35s cubic-bezier(0.25, 0.1, 0.1, 1.0),
              box-shadow 0.35s cubic-bezier(0.25, 0.1, 0.1, 1.0);
  transform: translateY(-3px);
  border-color: var(--el-color-primary);
  box-shadow: var(--dash-shadow-hover);
}
.wh-top { display: flex; align-items: center; gap: 12px; }
.wh-icon-box {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--dash-radius-sm);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 20px; flex-shrink: 0;
}
.wh-info { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.wh-name { font-size: 14px; font-weight: 500; color: var(--el-text-color-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wh-desc { font-size: 12px; color: var(--el-text-color-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wh-personal { font-size: 12px; color: var(--el-text-color-secondary); }
.wh-divider { margin: 0; }
.wh-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; }
.wh-stat { display: flex; flex-direction: column; }
.wh-stat-val { font-size: 18px; font-weight: 600; }
.wh-stat-label { font-size: 12px; color: var(--el-text-color-placeholder); }
.wh-time { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--el-text-color-placeholder); margin-top: auto; }
.time-icon { font-size: 12px; }
</style>

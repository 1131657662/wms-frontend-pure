<script setup lang="ts">
import { formatBusinessType } from "@/utils/format";

defineOptions({ name: "ActivityTimeline" });

interface Activity {
  time: string | Date;
  keys: string[];
}

defineProps<{ items: Activity[] }>();

function timeAgo(t: string | Date) {
  if (!t) return "";
  const d = new Date(t);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const s = d.toISOString();
  return s.slice(0, 16).replace("T", " ");
}
</script>

<template>
  <div class="timeline-wrapper">
    <el-timeline v-if="items.length">
      <el-timeline-item
        v-for="(item, idx) in items"
        :key="idx"
        :timestamp="timeAgo(item.time)"
        placement="top"
        :color="idx === 0 ? 'var(--el-color-primary)' : 'var(--el-color-info)'"
        size="large"
      >
        <p class="timeline-text">{{ item.keys?.[0] || "" }}</p>
        <el-tag
          v-if="item.keys?.[1]"
          size="small"
          effect="plain"
          round
          class="timeline-tag"
        >
          {{ formatBusinessType(item.keys[1]) }}
        </el-tag>
      </el-timeline-item>
    </el-timeline>
    <span v-else class="timeline-empty">暂无操作日志</span>
  </div>
</template>

<style scoped>
.timeline-wrapper :deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.timeline-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
}

.timeline-tag {
  margin-top: 6px;
}

.timeline-empty {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}
</style>

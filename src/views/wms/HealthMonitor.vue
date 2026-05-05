<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";

import Monitor from "~icons/ep/monitor";
import Connection from "~icons/ep/connection";
import Cpu from "~icons/ep/cpu";
import Timer from "~icons/ep/timer";

defineOptions({ name: "HealthMonitor" });

const data = ref<any>(null);
const loading = ref(false);
const autoRefresh = ref(true);
const lastUpdated = ref("");
let timer: ReturnType<typeof setInterval> | null = null;

// ==================== 系统状态 ====================
const healthStatus = computed(() => {
  if (!data.value) return { label: "—", color: "#909399", dot: "#c0c4cc" };
  const mem = parseFloat(data.value.memory?.usedPercent) || 0;
  const disk = parseFloat(data.value.disk?.usedPercent) || 0;
  const dbOk = data.value.db?.status === "正常";
  if (!dbOk) return { label: "异常", color: "#f56c6c", dot: "#f56c6c" };
  if (mem > 85 || disk > 85) return { label: "警告", color: "#e6a23c", dot: "#e6a23c" };
  return { label: "正常", color: "#67c23a", dot: "#67c23a" };
});

// ==================== 辅助 ====================
function pct(v: string) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n);
}

function rateColor(v: string) {
  const p = parseFloat(v);
  if (p > 80) return "#f56c6c";
  if (p > 60) return "#e6a23c";
  return "#67c23a";
}

function cpuLoadColor(load: string, count: string) {
  const p = (parseFloat(load) / parseFloat(count)) * 100;
  if (p > 80) return "#f56c6c";
  if (p > 60) return "#e6a23c";
  return "#67c23a";
}

// ==================== 数据请求 ====================
async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get("/health/status");
    data.value = res.data;
    lastUpdated.value = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  } finally { loading.value = false; }
}

function toggleAutoRefresh() {
  if (autoRefresh.value) {
    timer = setInterval(fetchData, 30_000);
  } else if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

onMounted(() => {
  fetchData();
  toggleAutoRefresh();
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 顶部状态栏 ==================== -->
    <div
      class="wms-card flex items-center gap-3 mb-4 flex-wrap"
      :style="{ padding: '14px 20px' }"
    >
      <span class="inline-flex items-center gap-1.5">
        <span class="status-dot" :style="{ background: healthStatus.dot }" />
        <span class="text-sm font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">系统状态</span>
        <span class="text-sm font-semibold" :style="{ color: healthStatus.color }">{{ healthStatus.label }}</span>
      </span>

      <el-divider direction="vertical" />

      <span v-if="lastUpdated" class="text-xs" :style="{ color: 'var(--el-text-color-secondary)' }">
        最后更新 {{ lastUpdated }}
      </span>

      <div class="flex-1" />

      <el-switch v-model="autoRefresh" size="small" active-text="自动刷新" inactive-text="手动" @change="toggleAutoRefresh" />
      <el-button size="small" :icon="useRenderIcon(Timer)" :loading="loading" @click="fetchData">刷新</el-button>
    </div>

    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          { label: '系统状态', value: healthStatus.label, color: healthStatus.color, icon: Monitor },
          { label: '运行时长', value: data?.server?.uptimeStr || '—', color: 'var(--el-color-primary)', icon: Timer },
          { label: '内存使用率', value: data?.memory?.usedPercent || '—', color: rateColor(data?.memory?.usedPercent || '0'), icon: Cpu }
        ]"
        :key="card.label"
        class="wms-card flex-1 flex items-center gap-3"
        :style="{ padding: '16px 20px' }"
      >
        <div
          class="flex items-center justify-center rounded-lg"
          :style="{ width: '40px', height: '40px', background: card.color + '15', color: card.color }"
        >
          <el-icon :size="20"><component :is="useRenderIcon(card.icon)" /></el-icon>
        </div>
        <div>
          <div class="text-xs" :style="{ color: 'var(--el-text-color-secondary)' }">{{ card.label }}</div>
          <div class="text-xl font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">{{ card.value }}</div>
        </div>
      </div>
    </div>

    <!-- ==================== 详情卡片网格 ==================== -->
    <div v-if="data" class="detail-grid">
      <!-- 服务器 -->
      <div class="detail-card">
        <div class="card-header">
          <span class="card-header-bar" :style="{ background: 'var(--el-color-primary)' }" />
          <span class="text-sm font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">服务器信息</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">平台</span>
            <span class="info-value">{{ data.server?.platform }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">主机名</span>
            <span class="info-value">{{ data.server?.hostname }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">运行时长</span>
            <span class="info-value">{{ data.server?.uptimeStr }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Node</span>
            <span class="info-value">{{ data.server?.nodeVersion }}</span>
          </div>
        </div>
      </div>

      <!-- 内存 -->
      <div class="detail-card">
        <div class="card-header">
          <span class="card-header-bar" :style="{ background: rateColor(data.memory?.usedPercent || '0') }" />
          <span class="text-sm font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">内存</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">总内存</span>
            <span class="info-value">{{ data.memory?.total }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">空闲</span>
            <span class="info-value">{{ data.memory?.free }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">使用率</span>
            <span class="info-value" :style="{ color: rateColor(data.memory?.usedPercent || '0'), fontWeight: 600 }">{{ data.memory?.usedPercent }}</span>
          </div>
          <el-progress
            :percentage="pct(data.memory?.usedPercent || '0')"
            :color="rateColor(data.memory?.usedPercent || '0')"
            :stroke-width="8"
            style="margin-top: 4px"
          />
        </div>
      </div>

      <!-- CPU -->
      <div class="detail-card">
        <div class="card-header">
          <span class="card-header-bar" :style="{ background: rateColor(data.cpu?.load1 / data.cpu?.count * 100 + '%') }" />
          <span class="text-sm font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">CPU</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">核心数</span>
            <span class="info-value">{{ data.cpu?.count }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">1分钟负载</span>
            <span class="info-value" :style="{ color: cpuLoadColor(data.cpu?.load1, data.cpu?.count), fontWeight: 600 }">{{ data.cpu?.load1 }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">5分钟负载</span>
            <span class="info-value">{{ data.cpu?.load5 }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">15分钟负载</span>
            <span class="info-value">{{ data.cpu?.load15 }}</span>
          </div>
        </div>
      </div>

      <!-- 数据库 -->
      <div class="detail-card">
        <div class="card-header">
          <span class="card-header-bar" :style="{ background: data.db?.status === '正常' ? '#67c23a' : '#f56c6c' }" />
          <span class="text-sm font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">数据库</span>
          <el-icon :size="14" class="ml-auto" :style="{ color: data.db?.status === '正常' ? '#67c23a' : '#f56c6c' }">
            <component :is="useRenderIcon(Connection)" />
          </el-icon>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">连接状态</span>
            <span class="info-value" :style="{ color: data.db?.status === '正常' ? '#67c23a' : '#f56c6c', fontWeight: 600 }">{{ data.db?.status }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">响应时间</span>
            <span class="info-value">{{ data.db?.responseMs }} ms</span>
          </div>
        </div>
      </div>

      <!-- 磁盘 -->
      <div v-if="data.disk" class="detail-card">
        <div class="card-header">
          <span class="card-header-bar" :style="{ background: rateColor(data.disk?.usedPercent || '0') }" />
          <span class="text-sm font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">磁盘</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">总容量</span>
            <span class="info-value">{{ data.disk?.total }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">空闲</span>
            <span class="info-value">{{ data.disk?.free }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">使用率</span>
            <span class="info-value" :style="{ color: rateColor(data.disk?.usedPercent || '0'), fontWeight: 600 }">{{ data.disk?.usedPercent }}</span>
          </div>
          <el-progress
            :percentage="pct(data.disk?.usedPercent || '0')"
            :color="rateColor(data.disk?.usedPercent || '0')"
            :stroke-width="8"
            style="margin-top: 4px"
          />
        </div>
      </div>
    </div>

    <!-- ==================== 加载 / 空 ==================== -->
    <div v-if="!data && !loading" class="flex justify-center py-12">
      <el-empty description="加载失败，请刷新重试" :image-size="80">
        <el-button type="primary" @click="fetchData">重新加载</el-button>
      </el-empty>
    </div>
  </div>
</template>

<style scoped>
/* 状态圆点 */
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 详情卡片网格 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.detail-card {
  border-radius: 6px;
  background: var(--el-bg-color);
  box-shadow: var(--el-box-shadow-light);
  border: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.card-header-bar {
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  flex-shrink: 0;
}

.card-body {
  padding: 14px 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  font-size: 13px;
}

.info-row + .info-row {
  border-top: 1px solid var(--el-border-color-lighter);
}

.info-label {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.info-value {
  color: var(--el-text-color-primary);
  font-weight: 500;
  text-align: right;
}

/* 响应式：窄屏时两列 */
@media (max-width: 1200px) {
  .detail-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

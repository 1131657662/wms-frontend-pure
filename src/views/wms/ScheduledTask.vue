<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import { responseList, responseTotal } from "@/utils/responseList";

import Clock from "~icons/ep/clock";
import VideoPlay from "~icons/ep/video-play";
import Tickets from "~icons/ep/tickets";

defineOptions({ name: "ScheduledTask" });

const tasks = ref<any[]>([]);
const loading = ref(false);
const triggerLoading = ref<number | null>(null);

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

// ==================== 统计 ====================
const stats = computed(() => ({
  total: tasks.value.length,
  enabled: tasks.value.filter((t: any) => t.enabled).length,
  lastRun:
    tasks.value
      .map((t: any) => t.last_run_time)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null
}));

// ==================== 列定义 ====================
const columns: any[] = [
  {
    label: "任务名称",
    prop: "task_name",
    minWidth: 140,
    showOverflowTooltip: true
  },
  {
    label: "任务标识",
    prop: "task_key",
    minWidth: 150,
    showOverflowTooltip: true
  },
  { label: "调度规则", slot: "cron_expression", width: 180 },
  {
    label: "描述",
    prop: "description",
    minWidth: 200,
    showOverflowTooltip: true
  },
  { label: "启用", slot: "enabled", width: 75, align: "center" },
  { label: "上次执行", slot: "last_run_time", width: 170 },
  {
    label: "操作",
    slot: "operation",
    width: 160,
    align: "center",
    fixed: "right"
  }
];

// ==================== 日志抽屉 ====================
const logVisible = ref(false);
const logs = ref<any[]>([]);
const logLoading = ref(false);
const logTaskName = ref("");
const logPagination = reactive({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true
});
let currentLogTaskKey = "";

const logColumns: any[] = [
  { type: "index", label: "#", width: 50 },
  { label: "触发方式", slot: "trigger_type", width: 80, align: "center" },
  { label: "状态", slot: "status", width: 80, align: "center" },
  {
    label: "结果",
    prop: "result_message",
    minWidth: 160,
    showOverflowTooltip: true
  },
  { label: "耗时(ms)", prop: "duration_ms", width: 95, align: "right" },
  { label: "开始时间", slot: "start_time", width: 170 },
  { label: "结束时间", slot: "end_time", width: 170 }
];

// ==================== Cron 映射 ====================
const cronLabelMap: Record<string, string> = {
  "0 2 * * *": "每天 02:00",
  "0 */6 * * *": "每 6 小时",
  "0 0 * * 0": "每周日 00:00",
  "30 2 * * *": "每天 02:30",
  "0 3 * * *": "每天 03:00"
};

function cronDesc(expr: string) {
  return cronLabelMap[expr] || "";
}

function cronParts(expr: string) {
  const parts = expr.split(" ");
  if (parts.length === 5) {
    return {
      minute: parts[0],
      hour: parts[1],
      dom: parts[2],
      month: parts[3],
      dow: parts[4]
    };
  }
  return null;
}

// ==================== 时间格式化 ====================
function formatTime(t: string) {
  if (!t) return "—";
  return new Date(t)
    .toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
    .replace(/\//g, "-");
}

function relativeTimeBrief(t: string) {
  if (!t) return "";
  const diff = Date.now() - new Date(t).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}分钟前`;
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

// ==================== 数据请求 ====================
async function fetchTasks() {
  loading.value = true;
  try {
    const r = await api.get("/sys/scheduled-task/list");
    tasks.value = responseList(r.data);
  } finally {
    loading.value = false;
  }
}

async function toggleTask(row: any) {
  try {
    await api.put(`/sys/scheduled-task/${row.id}`, { enabled: row.enabled });
    ElMessage.success(row.enabled ? "已启用" : "已禁用");
  } catch {
    row.enabled = row.enabled ? 0 : 1;
  }
}

async function triggerTask(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认立即执行「${row.task_name}」？`,
      "手动触发",
      { type: "info" }
    );
  } catch {
    return;
  }
  triggerLoading.value = row.id;
  try {
    const res = await api.post(`/sys/scheduled-task/${row.id}/trigger`);
    ElMessage.success(res.data.message || "执行完成");
    fetchTasks();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "执行失败");
  } finally {
    triggerLoading.value = null;
  }
}

function showLog(row: any) {
  currentLogTaskKey = row.task_key;
  logTaskName.value = row.task_name;
  logPagination.currentPage = 1;
  logVisible.value = true;
  fetchLogs();
}

async function fetchLogs() {
  logLoading.value = true;
  try {
    const res = await api.get("/sys/scheduled-task/log/list", {
      params: {
        page: logPagination.currentPage,
        pageSize: logPagination.pageSize,
        task_key: currentLogTaskKey
      }
    });
    logs.value = responseList(res.data);
    logPagination.total = responseTotal(res.data);
  } finally {
    logLoading.value = false;
  }
}

function onLogPageChange(p: number) {
  logPagination.currentPage = p;
  fetchLogs();
}
function onLogSizeChange(s: number) {
  logPagination.pageSize = s;
  logPagination.currentPage = 1;
  fetchLogs();
}

onMounted(fetchTasks);
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          {
            label: '任务总数',
            value: stats.total,
            color: 'var(--el-color-primary)',
            icon: Clock
          },
          {
            label: '已启用',
            value: stats.enabled,
            color: '#67c23a',
            icon: VideoPlay
          },
          {
            label: '最近执行',
            value: stats.lastRun ? relativeTimeBrief(stats.lastRun) : '—',
            color: 'var(--el-color-info)',
            icon: Tickets
          }
        ]"
        :key="card.label"
        class="wms-card flex-1 flex items-center gap-3"
        :style="{ padding: '16px 20px' }"
      >
        <div
          class="flex-c rounded-lg"
          :style="{
            width: '40px',
            height: '40px',
            background: card.color + '15',
            color: card.color
          }"
        >
          <el-icon :size="20"
            ><component :is="useRenderIcon(card.icon)"
          /></el-icon>
        </div>
        <div>
          <div
            class="text-xs"
            :style="{ color: 'var(--el-text-color-secondary)' }"
          >
            {{ card.label }}
          </div>
          <div
            class="text-xl font-semibold"
            :style="{ color: 'var(--el-text-color-primary)' }"
          >
            {{ card.value }}
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <PureTableBar
      title="定时任务管理"
      :columns="columns"
      storage-key="ScheduledTask"
      @refresh="fetchTasks"
    >
      <template
        v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }"
      >
        <pure-table
          :key="tableRefreshKey"
          row-key="id"
          border
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="left"
          :loading="loading"
          :size="size"
          :data="tasks"
          :columns="dynamicColumns"
          :header-cell-style="headerCellStyle"
          @header-dragend="
            (newWidth, _oldWidth, col) =>
              onColumnResize(col.label || col.property, newWidth)
          "
        >
          <template #empty><EmptyState title="暂无定时任务" /></template>

          <template #cron_expression="{ row }">
            <div class="cron-cell">
              <code class="cron-expr">{{ row.cron_expression }}</code>
              <span v-if="cronDesc(row.cron_expression)" class="cron-desc">{{
                cronDesc(row.cron_expression)
              }}</span>
            </div>
          </template>

          <template #enabled="{ row }">
            <el-switch
              v-model="row.enabled"
              :active-value="1"
              :inactive-value="0"
              size="small"
              @change="toggleTask(row)"
            />
          </template>

          <template #last_run_time="{ row }">
            <span v-if="row.last_run_time" class="text-sm">{{
              formatTime(row.last_run_time)
            }}</span>
            <span
              v-else
              class="text-sm"
              style="color: var(--el-text-color-placeholder)"
              >—</span
            >
          </template>

          <template #operation="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              :icon="useRenderIcon(VideoPlay)"
              :loading="triggerLoading === row.id"
              @click="triggerTask(row)"
            >
              立即执行
            </el-button>
            <el-button link size="small" @click="showLog(row)">日志</el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- ==================== 执行日志抽屉 ==================== -->
    <el-drawer
      v-model="logVisible"
      :title="`执行日志 — ${logTaskName}`"
      direction="rtl"
      size="700px"
      destroy-on-close
    >
      <pure-table
        :key="tableRefreshKey"
        row-key="id"
        border
        adaptive
        :adaptiveConfig="{ offsetBottom: 60 }"
        align-whole="left"
        :loading="logLoading"
        :data="logs"
        :columns="logColumns"
        :pagination="logPagination"
        :header-cell-style="headerCellStyle"
        @header-dragend="
          (newWidth, _oldWidth, col) =>
            onColumnResize(col.label || col.property, newWidth)
        "
        @page-size-change="onLogSizeChange"
        @page-current-change="onLogPageChange"
      >
        <template #trigger_type="{ row }">
          <el-tag
            effect="plain"
            size="small"
            :type="row.trigger_type === 'manual' ? 'warning' : 'info'"
          >
            {{ row.trigger_type === "manual" ? "手动" : "自动" }}
          </el-tag>
        </template>
        <template #status="{ row }">
          <span class="inline-flex items-center gap-1">
            <span
              class="status-dot"
              :class="row.status === 'success' ? 'dot-success' : 'dot-danger'"
            />
            <span
              :class="
                row.status === 'success' ? 'text-green-500' : 'text-red-500'
              "
            >
              {{ row.status === "success" ? "成功" : "失败" }}
            </span>
          </span>
        </template>
        <template #start_time="{ row }">{{
          formatTime(row.start_time)
        }}</template>
        <template #end_time="{ row }">{{ formatTime(row.end_time) }}</template>
      </pure-table>
    </el-drawer>
  </div>
</template>

<style scoped>
/* Cron 表达式 */
.cron-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cron-expr {
  width: fit-content;
  padding: 2px 6px;
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px;
  background: var(--el-fill-color-light);
  border-radius: 3px;
}

.cron-desc {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

/* 状态圆点 */
.status-dot {
  display: inline-block;
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dot-success {
  background: #67c23a;
}

.dot-danger {
  background: #f56c6c;
}

:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}

:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}
</style>

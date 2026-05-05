<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";

import AddFill from "~icons/ri/add-circle-line";
import Database from "~icons/ri/database-2-line";
import Time from "~icons/ep/timer";
import HardDrive from "~icons/ri/hard-drive-2-line";

defineOptions({ name: "DataBackup" });

const list = ref<any[]>([]);
const loading = ref(false);
const creating = ref(false);
const restoring = ref<string | null>(null);
const downloading = ref<string | null>(null);
const deleting = ref<string | null>(null);

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

// ==================== 统计 ====================
const stats = computed(() => {
  const sorted = [...list.value].sort((a, b) => (b.createTime || "").localeCompare(a.createTime || ""));
  return {
    total: list.value.length,
    latest: sorted[0]?.createTime || null,
    daily: list.value.filter((item: any) => item.tag === "日备份").length
  };
});

function relativeTimeBrief(t: string) {
  if (!t) return "";
  const diff = Date.now() - new Date(t).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}分钟前`;
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

// ==================== 列定义 ====================
const columns: any[] = [
  { type: "index", label: "#", width: 56 },
  { label: "文件名", prop: "filename", minWidth: 280, showOverflowTooltip: true },
  { label: "大小", prop: "size", width: 100 },
  { label: "类型", slot: "tag", width: 90, align: "center" },
  { label: "创建时间", slot: "createTime", width: 170 },
  { label: "操作", slot: "operation", width: 220, fixed: "right", align: "center" }
];

async function fetchData() {
  loading.value = true;
  try { list.value = (await api.get("/backup/list")).data; }
  finally { loading.value = false; }
}

async function createBackup() {
  creating.value = true;
  try {
    const res = await api.post("/backup/create");
    ElMessage.success(`备份成功：${res.data.data.filename} (${res.data.data.size})`);
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "备份失败");
  } finally { creating.value = false; }
}

async function downloadBackup(row: any) {
  downloading.value = row.filename;
  try {
    const res = await api.get(`/backup/download/${row.filename}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = row.filename; a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("下载已开始");
  } catch {
    ElMessage.error("下载失败");
  } finally {
    downloading.value = null;
  }
}

async function restoreBackup(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认恢复备份"${row.filename}"？当前数据将被覆盖，此操作不可撤销！`,
      "危险操作", { type: "error", confirmButtonText: "确认恢复" }
    );
  } catch { return; }
  restoring.value = row.filename;
  try {
    const res = await api.post("/backup/restore", { filename: row.filename });
    ElMessage.success(res.data.message);
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "恢复失败");
  } finally { restoring.value = null; }
}

async function deleteBackup(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除备份"${row.filename}"？`, "确认删除", { type: "warning" });
  } catch { return; }
  deleting.value = row.filename;
  try {
    await api.delete(`/backup/${row.filename}`);
    ElMessage.success("删除成功");
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "删除失败");
  } finally {
    deleting.value = null;
  }
}

function formatDate(t: string) {
  if (!t) return "—";
  return new Date(t).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).replace(/\//g, "-");
}

onMounted(fetchData);
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          { label: '备份总数', value: stats.total, color: 'var(--el-color-primary)', icon: Database },
          { label: '日备份', value: stats.daily, color: '#67c23a', icon: HardDrive },
          { label: '最近备份', value: stats.latest ? relativeTimeBrief(stats.latest) : '—', color: 'var(--el-color-info)', icon: Time }
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

    <!-- ==================== 操作卡片 ==================== -->
    <div
      class="wms-card mb-4"
    >
      <div :style="{ padding: '16px 20px 0' }">
        <div class="flex items-center gap-2 mb-3 text-sm font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">
          <span class="inline-block w-1 h-4 rounded" :style="{ background: 'var(--el-color-primary)' }" />
          操作
        </div>
        <el-button type="primary" :icon="useRenderIcon(AddFill)" :loading="creating" @click="createBackup">立即备份</el-button>
      </div>
      <div :style="{ padding: '12px 20px' }">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>
            <span class="text-xs">自动备份：每天凌晨 2:30 | 保留策略：最近 7 天每天保留，8～30 天每周保留一份，超过 30 天自动清理</span>
          </template>
        </el-alert>
      </div>
      <div
        class="flex items-center"
        :style="{ padding: '8px 20px', borderTop: '1px solid var(--el-border-color-lighter)' }"
      >
        <span class="text-xs" :style="{ color: 'var(--el-text-color-secondary)' }">
          共 <strong :style="{ color: 'var(--el-text-color-primary)' }">{{ stats.total }}</strong> 个备份文件
        </span>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <PureTableBar title="数据备份" :columns="columns" storage-key="DataBackup" @refresh="fetchData">
      <template v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }">
        <pure-table :key="tableRefreshKey"
          @header-dragend="(newWidth, _oldWidth, col) => onColumnResize(col.label || col.property, newWidth)"
          row-key="filename"
          border
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="left"
         
          :loading="loading"
          :size="size"
          :data="list"
          :columns="dynamicColumns"
          :header-cell-style="headerCellStyle"
        >
          <template #empty>
            <EmptyState title="暂无备份文件" description="点击「立即备份」创建数据库备份" />
          </template>
          <template #tag="{ row }">
            <el-tag effect="plain" size="small" :type="row.tag === '日备份' ? 'success' : row.tag === '周备份' ? 'warning' : 'info'">
              {{ row.tag }}
            </el-tag>
          </template>
          <template #createTime="{ row }">
            <span class="text-sm">{{ formatDate(row.createTime) }}</span>
          </template>
          <template #operation="{ row }">
            <el-button link size="small" :loading="downloading === row.filename" @click="downloadBackup(row)">下载</el-button>
            <el-button link size="small" type="warning" :loading="restoring === row.filename" @click="restoreBackup(row)">恢复</el-button>
            <el-button link size="small" type="danger" :loading="deleting === row.filename" @click="deleteBackup(row)">删除</el-button>
          </template>
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

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { getToken } from "@/utils/auth";
import api from "@/api/wms";
import { responseList, responseTotal } from "@/utils/responseList";

import Search from "~icons/ri/search-line";
import Download from "~icons/ep/download";
import Delete from "~icons/ep/delete";
import User from "~icons/ri/user-line";
import Time from "~icons/ep/timer";
import CopyDocument from "~icons/ep/document-copy";
import Clock from "~icons/ep/clock";

defineOptions({ name: "SysLog" });

// ==================== 当前用户 ====================
const currentUser = computed(() => {
  const token = getToken();
  if (!token?.accessToken) return "";
  try {
    const payload = JSON.parse(atob(token.accessToken.split(".")[1]));
    return payload.username || "";
  } catch {
    return "";
  }
});

// ==================== Tab ====================
const activeTab = ref("login");
const tabModules: Record<string, string> = {
  login: "登录",
  operation: "入库管理,出库管理,库存管理,基础资料,系统管理",
  system: "其他,个人中心"
};

// ==================== 时间快捷选项 ====================
type PresetKey = "15m" | "1h" | "6h" | "24h" | "7d" | "custom";
const presets: { key: PresetKey; label: string }[] = [
  { key: "15m", label: "15分钟" },
  { key: "1h", label: "1小时" },
  { key: "6h", label: "6小时" },
  { key: "24h", label: "24小时" },
  { key: "7d", label: "7天" },
  { key: "custom", label: "自定义" }
];
const activePreset = ref<PresetKey>("24h");

function applyPreset(key: PresetKey) {
  activePreset.value = key;
  if (key === "custom") return;
  const now = new Date();
  const map: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000
  };
  const start = new Date(now.getTime() - map[key]);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  filters.dateRange = [fmt(start), fmt(now)];
  handleSearch();
}

// ==================== 筛选 ====================
const filters = reactive({
  username: "",
  module: "",
  method: "",
  status: "",
  keyword: "",
  dateRange: null as [string, string] | null
});
const dataList = ref<any[]>([]);
const loading = ref(false);
const exporting = ref(false);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-SysLog")) || 20,
  currentPage: 1,
  background: true,
  pageSizes: [10, 20, 50, 100, 500, 1000]
});

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

// ==================== 活跃筛选标签 ====================
interface FilterChip {
  key: string;
  label: string;
  value: string;
}

const activeFilters = computed<FilterChip[]>(() => {
  const chips: FilterChip[] = [];
  if (filters.username)
    chips.push({ key: "username", label: "用户", value: filters.username });
  if (filters.module)
    chips.push({ key: "module", label: "模块", value: filters.module });
  if (filters.method)
    chips.push({ key: "method", label: "方法", value: filters.method });
  if (filters.status !== "")
    chips.push({
      key: "status",
      label: "状态",
      value: filters.status === "1" ? "成功" : "失败"
    });
  if (filters.keyword)
    chips.push({ key: "keyword", label: "关键词", value: filters.keyword });
  if (filters.dateRange)
    chips.push({
      key: "dateRange",
      label: "时间",
      value: `${filters.dateRange[0]} ~ ${filters.dateRange[1]}`
    });
  return chips;
});

function removeFilter(key: string) {
  if (key === "dateRange") {
    filters.dateRange = null;
    activePreset.value = "custom";
  } else if (key === "status") {
    filters.status = "";
  } else {
    (filters as any)[key] = "";
  }
  handleSearch();
}

// ==================== 时间 ====================
function formatTime(t: string) {
  if (!t) return "";
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

function relativeTime(t: string) {
  if (!t) return "";
  const diff = Date.now() - new Date(t).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "刚刚";
  if (sec < 60) return `${sec}秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day}天前`;
  return "";
}

// ==================== 耗时 ====================
function costClass(val: any) {
  if (val === null || val === undefined || val === "") return "";
  const n = Number(val);
  if (isNaN(n)) return "";
  if (n < 50) return "cost-fast";
  if (n <= 200) return "cost-normal";
  return "cost-slow";
}

function formatCost(val: any) {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
}

// ==================== 列 ====================
const loginColumns: any[] = [
  {
    type: "index",
    label: "#",
    width: 56,
    index: (i: number) =>
      (pagination.currentPage - 1) * pagination.pageSize + i + 1
  },
  { label: "用户名", prop: "username", width: 110 },
  {
    label: "操作描述",
    slot: "operation_desc",
    minWidth: 200,
    showOverflowTooltip: true
  },
  { label: "IP", prop: "ip", width: 140 },
  { label: "耗时", slot: "cost_time", width: 85, align: "right" },
  { label: "状态", slot: "status", width: 75, align: "center" },
  { label: "时间", slot: "create_time", width: 160 },
  { label: "操作", slot: "operation", width: 90, align: "center" }
];

const operationColumns: any[] = [
  {
    type: "index",
    label: "#",
    width: 56,
    index: (i: number) =>
      (pagination.currentPage - 1) * pagination.pageSize + i + 1
  },
  { label: "用户", prop: "username", width: 90 },
  { label: "模块", prop: "module", width: 95 },
  {
    label: "操作描述",
    slot: "operation_desc",
    minWidth: 220,
    showOverflowTooltip: true
  },
  { label: "方法", prop: "method", width: 65 },
  { label: "IP", prop: "ip", width: 135 },
  { label: "耗时", slot: "cost_time", width: 85, align: "right" },
  { label: "状态", slot: "status", width: 75, align: "center" },
  { label: "时间", slot: "create_time", width: 160 },
  { label: "操作", slot: "operation", width: 90, align: "center" }
];

const systemColumns: any[] = [
  {
    type: "index",
    label: "#",
    width: 56,
    index: (i: number) =>
      (pagination.currentPage - 1) * pagination.pageSize + i + 1
  },
  { label: "用户", prop: "username", width: 90 },
  {
    label: "请求路径",
    slot: "request_url",
    minWidth: 260,
    showOverflowTooltip: true
  },
  { label: "方法", prop: "method", width: 65 },
  { label: "IP", prop: "ip", width: 135 },
  { label: "耗时", slot: "cost_time", width: 85, align: "right" },
  { label: "状态", slot: "status", width: 75, align: "center" },
  { label: "时间", slot: "create_time", width: 160 },
  { label: "操作", slot: "operation", width: 90, align: "center" }
];

const columns = computed(() => {
  if (activeTab.value === "login") return loginColumns;
  if (activeTab.value === "system") return systemColumns;
  return operationColumns;
});

const showExportClean = computed(() => activeTab.value === "operation");

// ==================== 数据请求 ====================
async function fetchData() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    };
    if (filters.username) params.username = filters.username;
    if (filters.module) params.module = filters.module;
    if (filters.method) params.method = filters.method;
    if (filters.status !== "") params.status = filters.status;
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.dateRange) {
      params.startDate = filters.dateRange[0];
      params.endDate = filters.dateRange[1];
    }
    if (tabModules[activeTab.value])
      params.modules = tabModules[activeTab.value];
    const res = await api.get("/sys/log/list", { params });
    dataList.value = responseList(res.data);
    pagination.total = responseTotal(res.data);
  } finally {
    loading.value = false;
  }
}

const handleSearch = () => {
  pagination.currentPage = 1;
  fetchData();
};
const resetForm = () => {
  Object.assign(filters, {
    username: "",
    module: "",
    method: "",
    status: "",
    keyword: "",
    dateRange: null
  });
  activePreset.value = "custom";
  pagination.currentPage = 1;
  fetchData();
};
const handleSizeChange = (v: number) => {
  localStorage.setItem("page-size-SysLog", String(v));
  pagination.pageSize = v;
  fetchData();
};
const handleCurrentChange = (v: number) => {
  pagination.currentPage = v;
  fetchData();
};

function filterMyLogs() {
  if (!currentUser.value) {
    ElMessage.warning("无法获取当前用户信息");
    return;
  }
  filters.username = currentUser.value;
  handleSearch();
}

watch(activeTab, () => {
  resetForm();
});

// ==================== 详情抽屉 ====================
const drawerVisible = ref(false);
const detail = ref<any>({});

function openDetail(row: any) {
  detail.value = row;
  drawerVisible.value = true;
}

function copyParams(row: any) {
  if (!row.params) {
    ElMessage.info("无请求参数");
    return;
  }
  navigator.clipboard
    .writeText(formatParams(row.params))
    .then(() => ElMessage.success("已复制请求参数"));
}

function formatParams(str: string) {
  if (!str) return "";
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

// ==================== 导出 & 清理 ====================
async function handleExport() {
  exporting.value = true;
  try {
    const params: any = {};
    if (filters.username) params.username = filters.username;
    if (filters.module) params.module = filters.module;
    if (filters.method) params.method = filters.method;
    if (filters.status !== "") params.status = filters.status;
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.dateRange) {
      params.startDate = filters.dateRange[0];
      params.endDate = filters.dateRange[1];
    }
    if (tabModules[activeTab.value])
      params.modules = tabModules[activeTab.value];
    const res = await api.get("/sys/log/export", {
      params,
      responseType: "blob"
    });
    const url = URL.createObjectURL(new Blob([res as any]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "操作日志.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("导出成功");
  } catch {
    ElMessage.error("导出失败");
  } finally {
    exporting.value = false;
  }
}

const cleaning = ref(false);
async function handleClean() {
  try {
    await ElMessageBox.confirm("确定要清理过期操作日志吗？", "确认清理", {
      type: "warning"
    });
  } catch {
    return;
  }
  cleaning.value = true;
  try {
    const res = await api.delete("/sys/log/clean");
    ElMessage.success(
      `清理完成，共删除 ${res.data.deleted} 条超过 ${res.data.days} 天的日志`
    );
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "清理失败");
  } finally {
    cleaning.value = false;
  }
}

onMounted(() => {
  applyPreset("24h");
});
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 主操作卡片 ==================== -->
    <div class="wms-card mb-4">
      <!-- 顶部栏：Tabs + 时间快捷 -->
      <div
        class="flex-bc flex-wrap gap-y-2"
        :style="{
          padding: '12px 20px 0',
          borderBottom: '1px solid var(--el-border-color-lighter)'
        }"
      >
        <el-tabs v-model="activeTab" class="inline-tabs">
          <el-tab-pane label="登录日志" name="login" />
          <el-tab-pane label="操作日志" name="operation" />
          <el-tab-pane label="系统日志" name="system" />
        </el-tabs>
        <div class="flex items-center gap-1 pb-2">
          <el-button
            v-for="p in presets"
            :key="p.key"
            :type="activePreset === p.key ? 'primary' : ''"
            :plain="activePreset !== p.key"
            size="small"
            @click="p.key === 'custom' ? undefined : applyPreset(p.key)"
          >
            {{ p.label }}
          </el-button>
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="~"
            start-placeholder="开始"
            end-placeholder="结束"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            size="small"
            style="width: 230px"
            @change="
              activePreset = 'custom';
              handleSearch();
            "
          />
        </div>
      </div>

      <!-- 搜索栏 -->
      <div :style="{ padding: '16px 20px 0' }">
        <div class="flex items-center gap-3 flex-wrap">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索操作描述、请求路径、用户名..."
            clearable
            :prefix-icon="useRenderIcon(Search)"
            class="search-input"
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
          <el-select
            v-if="activeTab === 'operation'"
            v-model="filters.module"
            placeholder="业务模块"
            clearable
            class="w-30!"
            @clear="handleSearch"
            @change="handleSearch"
          >
            <el-option label="入库管理" value="入库管理" />
            <el-option label="出库管理" value="出库管理" />
            <el-option label="库存管理" value="库存管理" />
            <el-option label="基础资料" value="基础资料" />
            <el-option label="系统管理" value="系统管理" />
          </el-select>
          <el-select
            v-model="filters.method"
            placeholder="方法"
            clearable
            class="w-22!"
            @clear="handleSearch"
            @change="handleSearch"
          >
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
          <el-select
            v-model="filters.status"
            placeholder="状态"
            clearable
            class="w-22!"
            @clear="handleSearch"
            @change="handleSearch"
          >
            <el-option label="成功" value="1" />
            <el-option label="失败" value="0" />
          </el-select>
          <el-input
            v-model="filters.username"
            placeholder="用户名"
            clearable
            class="w-28!"
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
          <el-divider direction="vertical" />
          <el-button
            type="primary"
            :icon="useRenderIcon(Search)"
            :loading="loading"
            @click="handleSearch"
            >查询</el-button
          >
          <el-button @click="resetForm">重置</el-button>
        </div>

        <!-- 活跃筛选标签 -->
        <div
          v-if="activeFilters.length > 0"
          class="flex items-center gap-2 flex-wrap"
          style="padding-top: 12px"
        >
          <el-icon :size="14" color="var(--el-text-color-secondary)"
            ><component :is="useRenderIcon(Search)"
          /></el-icon>
          <span
            class="text-xs"
            :style="{ color: 'var(--el-text-color-secondary)' }"
            >筛选：</span
          >
          <el-tag
            v-for="chip in activeFilters"
            :key="chip.key"
            closable
            size="small"
            type="info"
            @close="removeFilter(chip.key)"
          >
            {{ chip.label }}: {{ chip.value }}
          </el-tag>
          <el-button link size="small" type="primary" @click="resetForm"
            >清除全部</el-button
          >
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div
        class="flex items-center gap-2 flex-wrap"
        :style="{
          padding: '12px 20px',
          borderTop: '1px solid var(--el-border-color-lighter)'
        }"
      >
        <template v-if="showExportClean">
          <el-button
            plain
            :icon="useRenderIcon(Download)"
            :loading="exporting"
            @click="handleExport"
            >导出 Excel</el-button
          >
          <el-button
            plain
            type="danger"
            :icon="useRenderIcon(Delete)"
            :loading="cleaning"
            @click="handleClean"
            >清理过期</el-button
          >
        </template>
        <el-button
          v-if="currentUser"
          plain
          :icon="useRenderIcon(User)"
          @click="filterMyLogs"
          >我的操作</el-button
        >
        <div class="flex-1" />
        <span
          class="text-xs"
          :style="{ color: 'var(--el-text-color-secondary)' }"
        >
          共
          <strong :style="{ color: 'var(--el-text-color-primary)' }">{{
            pagination.total
          }}</strong>
          条记录
        </span>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <PureTableBar
      :title="
        activeTab === 'login'
          ? '登录日志'
          : activeTab === 'operation'
            ? '操作日志'
            : '系统日志'
      "
      :columns="columns"
      storage-key="SysLog"
      @refresh="handleSearch"
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
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="pagination"
          :header-cell-style="headerCellStyle"
          :row-class-name="
            ({ row }: any) => (row.status === 0 ? 'row-failed' : '')
          "
          @header-dragend="
            (newWidth, _oldWidth, col) =>
              onColumnResize(col.label || col.property, newWidth)
          "
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #empty>
            <EmptyState
              title="暂无日志数据"
              description="尝试调整筛选条件或切换时间范围"
            />
          </template>

          <template #operation_desc="{ row }">
            <span :class="{ 'text-gray-400': !row.operation_desc }">{{
              row.operation_desc || row.operation || "—"
            }}</span>
          </template>

          <template #request_url="{ row }">
            <code class="text-xs url-code">{{ row.request_url }}</code>
          </template>

          <template #cost_time="{ row }">
            <span :class="costClass(row.cost_time)">{{
              formatCost(row.cost_time)
            }}</span>
          </template>

          <template #status="{ row }">
            <span class="inline-flex items-center gap-1">
              <span
                class="status-dot"
                :class="
                  row.status === 1
                    ? 'dot-success'
                    : row.status === 0
                      ? 'dot-danger'
                      : 'dot-unknown'
                "
              />
              <span
                v-if="row.status === 1"
                class="text-xs"
                style="color: #67c23a"
                >成功</span
              >
              <span
                v-else-if="row.status === 0"
                class="text-xs"
                style="color: #f56c6c"
                >失败</span
              >
              <span v-else class="text-xs" style="color: #909399">未知</span>
            </span>
          </template>

          <template #create_time="{ row }">
            <el-tooltip :content="formatTime(row.create_time)" placement="top">
              <span class="time-cell">{{
                relativeTime(row.create_time) || formatTime(row.create_time)
              }}</span>
            </el-tooltip>
          </template>

          <template #operation="{ row }">
            <div class="flex items-center gap-1">
              <el-button
                link
                type="primary"
                size="small"
                @click="openDetail(row)"
                >详情</el-button
              >
              <el-tooltip
                v-if="row.params"
                content="复制请求参数"
                placement="top"
              >
                <el-button
                  link
                  size="small"
                  :icon="useRenderIcon(CopyDocument)"
                  @click="copyParams(row)"
                />
              </el-tooltip>
            </div>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- ==================== 详情抽屉 ==================== -->
    <el-drawer
      v-model="drawerVisible"
      title="日志详情"
      direction="rtl"
      size="560px"
      destroy-on-close
      :close-on-click-modal="true"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <span class="text-base font-semibold">日志详情</span>
          <el-tag
            v-if="detail.status === 1"
            effect="plain"
            type="success"
            size="small"
            >成功</el-tag
          >
          <el-tag
            v-else-if="detail.status === 0"
            effect="plain"
            type="danger"
            size="small"
            >失败</el-tag
          >
        </div>
      </template>

      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="用户" :span="1">{{
          detail.username || "—"
        }}</el-descriptions-item>
        <el-descriptions-item label="模块" :span="1">{{
          detail.module || "—"
        }}</el-descriptions-item>
        <el-descriptions-item label="操作描述" :span="2">{{
          detail.operation_desc || detail.operation || "—"
        }}</el-descriptions-item>
        <el-descriptions-item label="请求路径">{{
          detail.request_url || "—"
        }}</el-descriptions-item>
        <el-descriptions-item label="方法">{{
          detail.method || "—"
        }}</el-descriptions-item>
        <el-descriptions-item label="业务类型">{{
          detail.business_type || "—"
        }}</el-descriptions-item>
        <el-descriptions-item label="业务 ID">{{
          detail.business_id || "—"
        }}</el-descriptions-item>
        <el-descriptions-item label="客户端 IP">{{
          detail.ip || "—"
        }}</el-descriptions-item>
        <el-descriptions-item label="耗时">
          <span :class="costClass(detail.cost_time)"
            >{{ formatCost(detail.cost_time) }}ms</span
          >
        </el-descriptions-item>
        <el-descriptions-item label="时间" :span="2">{{
          formatTime(detail.create_time)
        }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="detail.error_msg" class="mt-4">
        <div class="text-sm font-medium mb-2" style="color: #f56c6c">
          错误信息
        </div>
        <div class="error-block">{{ detail.error_msg }}</div>
      </div>

      <div class="mt-4">
        <div class="flex-bc mb-2">
          <span
            class="text-sm font-medium"
            :style="{ color: 'var(--el-text-color-primary)' }"
            >请求参数</span
          >
          <el-button
            v-if="detail.params"
            link
            size="small"
            :icon="useRenderIcon(CopyDocument)"
            @click="copyParams(detail)"
            >复制</el-button
          >
        </div>
        <pre v-if="detail.params" class="params-pre">{{
          formatParams(detail.params)
        }}</pre>
        <div v-else class="text-sm" style="color: #909399">无请求参数</div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
/* Tabs 嵌入卡片 */
.inline-tabs {
  margin-bottom: -1px;
}

.inline-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.inline-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

/* 搜索输入 */
.search-input {
  flex: 1;
  min-width: 280px;
}

.search-input :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-input-border-color, var(--el-border-color))
    inset;
}

/* URL 代码样式 */
.url-code {
  padding: 1px 6px;
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 11px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border-radius: 3px;
}

/* 状态圆点 */
.status-dot {
  display: inline-block;
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.dot-success {
  background: #67c23a;
}

.dot-danger {
  background: #f56c6c;
}

.dot-unknown {
  background: #c0c4cc;
}

/* 时间列 */
.time-cell {
  font-variant-numeric: tabular-nums;
  cursor: default;
  border-bottom: 1px dashed var(--el-text-color-disabled);
}

/* 错误信息块 */
.error-block {
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #f56c6c;
  word-break: break-all;
  background: rgb(245 108 108 / 6%);
  border: 1px solid rgb(245 108 108 / 15%);
  border-radius: 6px;
}

/* 耗时颜色 */
.cost-fast {
  font-weight: 500;
  color: #67c23a;
}

.cost-normal {
  font-weight: 500;
  color: #e6a23c;
}

.cost-slow {
  font-weight: 600;
  color: #f56c6c;
}

/* 参数 JSON */
.params-pre {
  max-height: 360px;
  padding: 14px;
  overflow: auto;
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

/* 表格行高 */
:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 10px;
  padding-bottom: 10px;
}

:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}

/* 失败行背景 */
:deep(.row-failed > td) {
  background-color: rgb(245 108 108 / 3%) !important;
}

:deep(.row-failed:hover > td) {
  background-color: rgb(245 108 108 / 6%) !important;
}

/* 抽屉内描述表 */
:deep(.el-descriptions__cell) {
  word-break: break-all;
}
</style>

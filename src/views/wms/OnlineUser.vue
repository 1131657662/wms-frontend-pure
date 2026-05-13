<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import { responseList, responseTotal } from "@/utils/responseList";

import Search from "~icons/ri/search-line";
import User from "~icons/ri/user-line";
import Computer from "~icons/ri/computer-line";
import Timer from "~icons/ep/timer";

defineOptions({ name: "OnlineUser" });

const dataList = ref<any[]>([]);
const loading = ref(false);
const filterUsername = ref("");
const kicking = ref<number | null>(null);

const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-OnlineUser")) || 20,
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

// ==================== 统计 ====================
const stats = computed(() => {
  const now = Date.now();
  const active1m = dataList.value.filter((u: any) => {
    if (!u.last_active_time) return false;
    return now - new Date(u.last_active_time).getTime() < 60_000;
  }).length;
  return {
    total: pagination.total,
    activeNow: active1m,
    lastLogin:
      dataList.value
        .map((u: any) => u.login_time)
        .filter(Boolean)
        .sort()
        .reverse()[0] || null
  };
});

// ==================== 时间 ====================
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
  return `${Math.floor(hour / 24)}天前`;
}

// ==================== 列定义 ====================
const columns: any[] = [
  {
    type: "index",
    label: "#",
    width: 56,
    index: (i: number) =>
      (pagination.currentPage - 1) * pagination.pageSize + i + 1
  },
  { label: "用户名", prop: "username", width: 130 },
  { label: "昵称", prop: "nickname", width: 130 },
  { label: "状态", slot: "online_status", width: 85, align: "center" },
  { label: "IP 地址", prop: "ip", width: 150 },
  { label: "登录时间", slot: "login_time", width: 170 },
  { label: "最近活跃", slot: "last_active_time", width: 160 },
  { label: "操作", slot: "operation", width: 90, align: "center" }
];

// ==================== 数据请求 ====================
async function fetchData() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    };
    if (filterUsername.value) params.username = filterUsername.value;
    const res = await api.get("/sys/online/list", { params });
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
const handleReset = () => {
  filterUsername.value = "";
  handleSearch();
};
const handleSizeChange = (v: number) => {
  localStorage.setItem("page-size-OnlineUser", String(v));
  pagination.pageSize = v;
  fetchData();
};
const handleCurrentChange = (v: number) => {
  pagination.currentPage = v;
  fetchData();
};

async function handleKick(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认强制下线用户「${row.username}」？该用户需要重新登录才能访问系统。`,
      "强制下线",
      { type: "warning", confirmButtonText: "确认下线" }
    );
  } catch {
    return;
  }

  kicking.value = row.user_id;
  try {
    await api.post("/sys/online/kick", { user_id: row.user_id });
    ElMessage.success(`${row.username} 已被强制下线`);
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "操作失败");
  } finally {
    kicking.value = null;
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          {
            label: '当前在线',
            value: stats.total,
            color: '#67c23a',
            icon: User
          },
          {
            label: '活跃用户',
            value: stats.activeNow,
            color: 'var(--el-color-primary)',
            icon: Computer
          },
          {
            label: '最近登录',
            value: stats.lastLogin ? relativeTime(stats.lastLogin) : '—',
            color: 'var(--el-color-info)',
            icon: Timer
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

    <!-- ==================== 搜索卡片 ==================== -->
    <div class="wms-card mb-4">
      <!-- 搜索栏 -->
      <div :style="{ padding: '16px 20px' }">
        <div class="flex items-center gap-3 flex-wrap">
          <el-input
            v-model="filterUsername"
            placeholder="搜索用户名..."
            clearable
            :prefix-icon="useRenderIcon(Search)"
            class="search-input"
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
          <el-button
            type="primary"
            :icon="useRenderIcon(Search)"
            :loading="loading"
            @click="handleSearch"
            >查询</el-button
          >
          <el-button @click="handleReset">重置</el-button>
        </div>
      </div>

      <!-- 底部信息栏 -->
      <div
        class="flex items-center gap-2 flex-wrap"
        :style="{
          padding: '10px 20px',
          borderTop: '1px solid var(--el-border-color-lighter)'
        }"
      >
        <el-alert
          type="info"
          :closable="false"
          show-icon
          class="flex-1!"
          style="padding: 6px 12px"
        >
          <template #title>
            <span class="text-xs"
              >最近 5 分钟有操作的用户视为在线，活跃用户 = 最近 1
              分钟内有操作</span
            >
          </template>
        </el-alert>
        <span
          class="text-xs"
          :style="{ color: 'var(--el-text-color-secondary)' }"
        >
          共
          <strong :style="{ color: 'var(--el-text-color-primary)' }">{{
            pagination.total
          }}</strong>
          人在线
        </span>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <PureTableBar
      title="在线用户"
      :columns="columns"
      storage-key="OnlineUser"
      @refresh="fetchData"
    >
      <template
        v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }"
      >
        <pure-table
          :key="tableRefreshKey"
          row-key="user_id"
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
          @header-dragend="
            (newWidth, _oldWidth, col) =>
              onColumnResize(col.label || col.property, newWidth)
          "
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #empty>
            <EmptyState
              title="暂无在线用户"
              description="用户登录并活跃后会自动出现在此列表中"
            />
          </template>

          <template #online_status="{ row }">
            <span class="inline-flex items-center gap-1.5">
              <span
                class="status-dot"
                :class="
                  Date.now() - new Date(row.last_active_time).getTime() < 60_000
                    ? 'dot-active'
                    : 'dot-idle'
                "
              />
              <span
                class="text-xs"
                :style="{
                  color:
                    Date.now() - new Date(row.last_active_time).getTime() <
                    60_000
                      ? '#67c23a'
                      : '#e6a23c'
                }"
              >
                {{
                  Date.now() - new Date(row.last_active_time).getTime() < 60_000
                    ? "活跃"
                    : "在线"
                }}
              </span>
            </span>
          </template>

          <template #login_time="{ row }">
            <el-tooltip :content="formatTime(row.login_time)" placement="top">
              <span class="time-cell">{{
                relativeTime(row.login_time) || formatTime(row.login_time)
              }}</span>
            </el-tooltip>
          </template>

          <template #last_active_time="{ row }">
            <el-tooltip
              :content="formatTime(row.last_active_time)"
              placement="top"
            >
              <span class="time-cell">{{
                relativeTime(row.last_active_time)
              }}</span>
            </el-tooltip>
          </template>

          <template #operation="{ row }">
            <el-button
              link
              type="danger"
              size="small"
              :loading="kicking === row.user_id"
              @click="handleKick(row)"
              >强退</el-button
            >
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style scoped>
/* 搜索输入 */
.search-input {
  flex: 1;
  min-width: 240px;
}

.search-input :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-input-border-color, var(--el-border-color))
    inset;
}

/* 状态圆点 */
.status-dot {
  display: inline-block;
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.dot-active {
  background: #67c23a;
}

.dot-idle {
  background: #e6a23c;
}

/* 时间列 */
.time-cell {
  font-variant-numeric: tabular-nums;
  cursor: default;
  border-bottom: 1px dashed var(--el-text-color-disabled);
}

/* 表格行高与hover */
:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}

:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}
</style>

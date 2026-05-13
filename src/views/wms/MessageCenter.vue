<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import { hasPerms } from "@/utils/auth";
import {
  dictDataToOptions,
  responseDictList,
  responseList,
  responseTotal
} from "@/utils/responseList";
import { MESSAGE_TYPE_MAP, MESSAGE_TYPE_TAG } from "@/utils/format";

import Message from "~icons/ri/message-2-line";
import MailUnread from "~icons/ri/mail-unread-line";
import Alarm from "~icons/ep/bell";
import Search from "~icons/ri/search-line";
import Check from "~icons/ep/check";
import Send from "~icons/ri/send-plane-line";

defineOptions({ name: "MessageCenter" });

const typeMap = reactive<Record<string, string>>({});
const typeTagMap = reactive<Record<string, string>>({});
const typeOptions = ref<{ label: string; value: string }[]>([]);

type ElTagType = "primary" | "success" | "warning" | "danger" | "info";

function coerceElTagType(v: string | undefined): ElTagType {
  const s = (v || "info").trim();
  if (
    s === "primary" ||
    s === "success" ||
    s === "warning" ||
    s === "danger" ||
    s === "info"
  ) {
    return s;
  }
  return "info";
}

function messageRowTagType(msgType: string | undefined): ElTagType {
  if (!msgType) return "info";
  return coerceElTagType(
    typeTagMap[msgType] || MESSAGE_TYPE_TAG[msgType] || "info"
  );
}

async function loadTypeDict() {
  try {
    const res = await api.get("/sys/dict/data/message_type");
    const list = responseDictList(res.data);
    typeOptions.value = dictDataToOptions(list);
    for (const d of list) {
      if (!d.dict_value) continue;
      typeMap[d.dict_value] = d.dict_label;
      typeTagMap[d.dict_value] = coerceElTagType(d.remark);
    }
  } catch {
    /* 字典加载失败 */
  }
}

const list = ref<any[]>([]);
const loading = ref(false);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-MessageCenter")) || 20,
  currentPage: 1,
  background: true,
  pageSizes: [10, 20, 50, 100, 500, 1000]
});
const filterType = ref("");
const filterRead = ref<number | "">("");
const selectedIds = ref<number[]>([]);
const readingAll = ref(false);
const batchDeleting = ref(false);
const deleting = ref<number | null>(null);
const sendDialogVisible = ref(false);
const sending = ref(false);
const sendForm = ref({ type: "announcement", title: "", content: "" });

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

// ==================== 统计 ====================
const stats = computed(() => ({
  total: pagination.total,
  unread: list.value.filter((m: any) => !m.is_read).length,
  alert: list.value.filter((m: any) => m.type?.startsWith("alert")).length
}));

// ==================== 列定义 ====================
const columns: any[] = [
  { type: "selection", label: "选择", width: 45 },
  {
    type: "index",
    label: "#",
    width: 56,
    index: (i: number) =>
      (pagination.currentPage - 1) * pagination.pageSize + i + 1
  },
  { label: "标题", prop: "title", minWidth: 200, showOverflowTooltip: true },
  { label: "内容", prop: "content", minWidth: 300, showOverflowTooltip: true },
  { label: "类型", slot: "type", width: 130 },
  { label: "状态", slot: "is_read", width: 80, align: "center" },
  { label: "时间", slot: "create_time", width: 170 },
  {
    label: "操作",
    slot: "operation",
    width: 150,
    fixed: "right",
    align: "center"
  }
];

function onSelectionChange(rows: any[]) {
  selectedIds.value = rows.map(r => r.id);
}

async function fetchData() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    };
    if (filterType.value) params.type = filterType.value;
    if (filterRead.value !== "" && filterRead.value !== null)
      params.is_read = filterRead.value;
    const res = await api.get("/message/list", { params });
    list.value = responseList(res.data);
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
  filterType.value = "";
  filterRead.value = "";
  pagination.currentPage = 1;
  fetchData();
};
const onPageChange = (p: number) => {
  pagination.currentPage = p;
  fetchData();
};
const onPageSizeChange = (s: number) => {
  pagination.pageSize = s;
  pagination.currentPage = 1;
  fetchData();
};

async function markRead(row: any) {
  await api.put(`/message/${row.id}/read`);
  row.is_read = 1;
  window.dispatchEvent(new CustomEvent("unread-count-change"));
}

async function markAllRead() {
  readingAll.value = true;
  try {
    await api.put("/message/read-all");
    ElMessage.success("全部标记为已读");
    window.dispatchEvent(new CustomEvent("unread-count-change"));
    fetchData();
  } finally {
    readingAll.value = false;
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm("确定删除此消息？", "提示", { type: "warning" });
  deleting.value = row.id;
  try {
    await api.delete(`/message/${row.id}`);
    ElMessage.success("删除成功");
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "删除失败");
  } finally {
    deleting.value = null;
  }
}

async function batchDelete() {
  await ElMessageBox.confirm(
    `确定删除选中的 ${selectedIds.value.length} 条消息？`,
    "提示",
    { type: "warning" }
  );
  batchDeleting.value = true;
  try {
    await api.post("/message/batch-delete", { ids: selectedIds.value });
    ElMessage.success("删除成功");
    selectedIds.value = [];
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "删除失败");
  } finally {
    batchDeleting.value = false;
  }
}

function openSendDialog() {
  sendForm.value = { type: "announcement", title: "", content: "" };
  sendDialogVisible.value = true;
}

async function handleSend() {
  sending.value = true;
  try {
    await api.post("/message/send", sendForm.value);
    ElMessage.success("消息发送成功");
    sendDialogVisible.value = false;
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "发送失败");
  } finally {
    sending.value = false;
  }
}

function formatTime(v: string) {
  if (!v) return "—";
  return new Date(v)
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

onMounted(() => {
  loadTypeDict();
  fetchData();
});
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          {
            label: '消息总数',
            value: stats.total,
            color: 'var(--el-color-primary)',
            icon: Message
          },
          {
            label: '未读消息',
            value: stats.unread,
            color: stats.unread > 0 ? '#f56c6c' : '#67c23a',
            icon: MailUnread
          },
          {
            label: '预警消息',
            value: stats.alert,
            color: '#e6a23c',
            icon: Alarm
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

    <!-- ==================== 操作卡片 ==================== -->
    <div class="wms-card mb-4">
      <div :style="{ padding: '16px 20px' }">
        <div class="flex items-center gap-3 flex-wrap">
          <el-select
            v-model="filterType"
            clearable
            placeholder="消息类型"
            class="w-40!"
            @change="handleSearch"
          >
            <el-option
              v-for="t in typeOptions"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
          <el-select
            v-model="filterRead"
            clearable
            placeholder="读取状态"
            class="w-28!"
            @change="handleSearch"
          >
            <el-option label="未读" :value="0" />
            <el-option label="已读" :value="1" />
          </el-select>
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
      </div>
      <div
        class="flex items-center gap-2 flex-wrap"
        :style="{
          padding: '12px 20px',
          borderTop: '1px solid var(--el-border-color-lighter)'
        }"
      >
        <el-button
          plain
          :icon="useRenderIcon(Check)"
          :loading="readingAll"
          @click="markAllRead"
          >全部已读</el-button
        >
        <el-button
          plain
          type="danger"
          :disabled="selectedIds.length === 0"
          :loading="batchDeleting"
          @click="batchDelete"
          >批量删除 ({{ selectedIds.length }})</el-button
        >
        <el-divider direction="vertical" />
        <el-button
          v-if="hasPerms('message:send')"
          type="primary"
          :icon="useRenderIcon(Send)"
          @click="openSendDialog"
          >发送消息</el-button
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
          条消息
        </span>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <PureTableBar
      title="消息中心"
      :columns="columns"
      storage-key="MessageCenter"
      @refresh="fetchData"
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
          :data="list"
          :columns="dynamicColumns"
          :pagination="pagination"
          :header-cell-style="headerCellStyle"
          @header-dragend="
            (newWidth, _oldWidth, col) =>
              onColumnResize(col.label || col.property, newWidth)
          "
          @selection-change="onSelectionChange"
          @page-size-change="onPageSizeChange"
          @page-current-change="onPageChange"
        >
          <template #empty>
            <EmptyState title="暂无消息" />
          </template>
          <template #type="{ row }">
            <el-tag
              effect="plain"
              size="small"
              :type="messageRowTagType(row.type)"
              >{{
                typeMap[row.type] || MESSAGE_TYPE_MAP[row.type] || row.type
              }}</el-tag
            >
          </template>
          <template #is_read="{ row }">
            <span class="inline-flex items-center gap-1.5">
              <span
                class="status-dot"
                :class="row.is_read ? 'dot-read' : 'dot-unread'"
              />
              <span
                class="text-xs"
                :style="{ color: row.is_read ? '#909399' : '#f56c6c' }"
                >{{ row.is_read ? "已读" : "未读" }}</span
              >
            </span>
          </template>
          <template #create_time="{ row }">{{
            formatTime(row.create_time)
          }}</template>
          <template #operation="{ row }">
            <el-button
              v-if="!row.is_read"
              link
              type="primary"
              size="small"
              @click="markRead(row)"
              >标记已读</el-button
            >
            <el-button
              link
              type="danger"
              size="small"
              :loading="deleting === row.id"
              @click="handleDelete(row)"
              >删除</el-button
            >
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- ==================== 发送消息弹窗 ==================== -->
    <el-dialog
      v-model="sendDialogVisible"
      title="发送消息"
      width="520px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form :model="sendForm" label-width="80px">
        <el-form-item label="消息类型">
          <el-select v-model="sendForm.type" class="w-full!">
            <el-option
              v-for="t in typeOptions"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="消息标题">
          <el-input
            v-model="sendForm.title"
            placeholder="请输入消息标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="消息内容">
          <el-input
            v-model="sendForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入消息内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <div
          class="text-xs"
          :style="{
            color: 'var(--el-text-color-placeholder)',
            paddingLeft: '80px'
          }"
        >
          发送后所有在线用户将在顶部铃铛通知栏中收到此消息
        </div>
      </el-form>
      <template #footer>
        <el-button @click="sendDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sending" @click="handleSend"
          >发送</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.search-input {
  flex: 1;
  min-width: 240px;
}

.search-input :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-input-border-color, var(--el-border-color))
    inset;
}

.status-dot {
  display: inline-block;
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dot-unread {
  background: #f56c6c;
}

.dot-read {
  background: #c0c4cc;
}

:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}

:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}
</style>

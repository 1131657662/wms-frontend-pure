<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import { fetchAllListPages } from "@/utils/fetchAllListPages";

import AddFill from "~icons/ri/add-circle-line";
import User from "~icons/ri/user-line";
import Shield from "~icons/ri/shield-user-line";
import Time from "~icons/ep/timer";
import Search from "~icons/ri/search-line";

defineOptions({ name: "UserList" });

const searchForm = reactive({ keyword: "" });
const dataList = ref([]);
const loading = ref(false);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-UserList")) || 20,
  currentPage: 1,
  background: true,
  pageSizes: [10, 20, 50, 100, 500, 1000]
});
const roles = ref<any[]>([]);

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

// ==================== 统计 ====================
const stats = computed(() => ({
  total: pagination.total,
  active: dataList.value.filter((u: any) => u.status === 1).length,
  roles: roles.value.length
}));

// ==================== 列定义 ====================
const columns: any[] = [
  {
    type: "index",
    label: "#",
    width: 56,
    index: (i: number) =>
      (pagination.currentPage - 1) * pagination.pageSize + i + 1
  },
  { label: "用户名", prop: "username", width: 130, showOverflowTooltip: true },
  { label: "昵称", prop: "nickname", width: 130 },
  { label: "手机号", prop: "phone", width: 140 },
  { label: "邮箱", prop: "email", width: 180, showOverflowTooltip: true },
  { label: "角色", slot: "role_names", minWidth: 180 },
  { label: "状态", slot: "status", width: 80, align: "center" },
  { label: "创建时间", slot: "create_time", width: 170 },
  {
    label: "操作",
    slot: "operation",
    width: 220,
    fixed: "right",
    align: "center"
  }
];

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get("/sys/user/list", {
      params: {
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        keyword: searchForm.keyword || undefined
      }
    });
    dataList.value = res.data.list;
    pagination.total = res.data.total;
  } finally {
    loading.value = false;
  }
}

const onSearch = () => {
  pagination.currentPage = 1;
  fetchData();
};
const resetForm = () => {
  searchForm.keyword = "";
  pagination.currentPage = 1;
  fetchData();
};
const handleSizeChange = (v: number) => {
  localStorage.setItem("page-size-UserList", String(v));
  pagination.pageSize = v;
  fetchData();
};
const handleCurrentChange = (v: number) => {
  pagination.currentPage = v;
  fetchData();
};

async function loadRoles() {
  try {
    roles.value = (await fetchAllListPages("/sys/role/list", {})) as any[];
  } catch {
    /* empty */
  }
}

// ==================== 弹窗 ====================
const dialogVisible = ref(false);
const dialogTitle = ref("新增用户");
const saving = ref(false);
const form = reactive({
  id: null as number | null,
  username: "",
  nickname: "",
  phone: "",
  email: "",
  status: 1,
  role_ids: [] as number[],
  remark: ""
});
const formRef = ref();
const formRules = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }]
};

function openDialog(row?: any) {
  if (row?.id) {
    dialogTitle.value = "编辑用户";
    Object.assign(form, {
      id: row.id,
      username: row.username,
      nickname: row.nickname || "",
      phone: row.phone || "",
      email: row.email || "",
      status: row.status,
      role_ids: row.sys_roles?.map((r: any) => r.id) || [],
      remark: row.remark || ""
    });
  } else {
    dialogTitle.value = "新增用户";
    Object.assign(form, {
      id: null,
      username: "",
      nickname: "",
      phone: "",
      email: "",
      status: 1,
      role_ids: [],
      remark: ""
    });
  }
  dialogVisible.value = true;
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (form.id) {
      await api.put(`/sys/user/${form.id}`, { ...form });
    } else {
      await api.post("/sys/user", { ...form });
    }
    ElMessage.success(form.id ? "更新成功" : "创建成功，初始密码为 123456");
    dialogVisible.value = false;
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "操作失败");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除用户「${row.username}」？`, "提示", {
    type: "warning"
  });
  await api.delete(`/sys/user/${row.id}`);
  ElMessage.success("删除成功");
  fetchData();
}

async function handleResetPassword(row: any) {
  await ElMessageBox.confirm(
    `确定将「${row.username}」的密码重置为 123456？`,
    "提示",
    { type: "warning" }
  );
  await api.post(`/sys/user/${row.id}/reset-password`);
  ElMessage.success("密码已重置为 123456");
}

async function handleToggleStatus(row: any, v: boolean) {
  try {
    await api.put(`/sys/user/${row.id}`, {
      status: v ? 1 : 0,
      role_ids: row.sys_roles?.map((r: any) => r.id) || []
    });
    row.status = v ? 1 : 0;
    ElMessage.success(v ? "已启用" : "已停用");
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "操作失败");
    fetchData();
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
  fetchData();
  loadRoles();
});
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          {
            label: '用户总数',
            value: stats.total,
            color: 'var(--el-color-primary)',
            icon: User
          },
          {
            label: '角色数',
            value: stats.roles,
            color: '#67c23a',
            icon: Shield
          },
          {
            label: '本页启用',
            value: stats.active,
            color: 'var(--el-color-info)',
            icon: Time
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
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索用户名 / 昵称 / 手机号..."
            clearable
            :prefix-icon="useRenderIcon(Search)"
            class="search-input"
            @clear="fetchData"
            @keyup.enter="onSearch"
          />
          <el-divider direction="vertical" />
          <el-button
            type="primary"
            :icon="useRenderIcon(Search)"
            :loading="loading"
            @click="onSearch"
            >查询</el-button
          >
          <el-button @click="resetForm">重置</el-button>
          <div class="flex-1" />
          <el-button
            type="primary"
            :icon="useRenderIcon(AddFill)"
            @click="openDialog()"
            >新增用户</el-button
          >
        </div>
      </div>
      <div
        class="flex items-center"
        :style="{
          padding: '10px 20px',
          borderTop: '1px solid var(--el-border-color-lighter)'
        }"
      >
        <span
          class="text-xs"
          :style="{ color: 'var(--el-text-color-secondary)' }"
        >
          共
          <strong :style="{ color: 'var(--el-text-color-primary)' }">{{
            pagination.total
          }}</strong>
          个用户
        </span>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <PureTableBar
      title="用户管理"
      :columns="columns"
      storage-key="UserList"
      @refresh="onSearch"
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
          @header-dragend="
            (newWidth, _oldWidth, col) =>
              onColumnResize(col.label || col.property, newWidth)
          "
          :header-cell-style="headerCellStyle"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #empty>
            <EmptyState
              title="暂无用户数据"
              description="点击「新增用户」创建"
            />
          </template>
          <template #role_names="{ row }">
            <template v-if="row.sys_roles?.length">
              <el-tag
                v-for="r in row.sys_roles"
                :key="r.id"
                effect="plain"
                size="small"
                class="mr-1"
                >{{ r.role_name }}</el-tag
              >
            </template>
            <span
              v-else
              class="text-xs"
              style="color: var(--el-text-color-placeholder)"
              >—</span
            >
          </template>
          <template #status="{ row }">
            <span class="inline-flex items-center gap-1.5">
              <span
                class="status-dot"
                :class="row.status === 1 ? 'dot-success' : 'dot-danger'"
              />
              <el-switch
                :model-value="row.status === 1"
                size="small"
                @change="(v: boolean) => handleToggleStatus(row, v)"
              />
            </span>
          </template>
          <template #create_time="{ row }">{{
            formatTime(row.create_time)
          }}</template>
          <template #operation="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)"
              >编辑</el-button
            >
            <el-button
              link
              type="warning"
              size="small"
              @click="handleResetPassword(row)"
              >重置密码</el-button
            >
            <el-button
              link
              type="danger"
              size="small"
              @click="handleDelete(row)"
              >删除</el-button
            >
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="550px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="昵称"
          ><el-input v-model="form.nickname"
        /></el-form-item>
        <el-form-item label="手机号"
          ><el-input v-model="form.phone"
        /></el-form-item>
        <el-form-item label="邮箱"
          ><el-input v-model="form.email"
        /></el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role_ids" multiple class="w-full!">
            <el-option
              v-for="r in roles"
              :key="r.id"
              :label="`${r.role_code} ${r.role_name}`"
              :value="r.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"
          ><el-input v-model="form.remark" type="textarea" :rows="2"
        /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave"
          >保存</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.search-input {
  flex: 1;
  min-width: 260px;
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

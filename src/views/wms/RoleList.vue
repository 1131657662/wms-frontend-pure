<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";

import AddFill from "~icons/ri/add-circle-line";
import Shield from "~icons/ri/shield-user-line";
import Key from "~icons/ri/key-2-line";
import Time from "~icons/ep/timer";
import Search from "~icons/ri/search-line";

defineOptions({ name: "RoleList" });

const searchForm = reactive({ keyword: "" });
const dataList = ref([]);
const loading = ref(false);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-RoleList")) || 20,
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
const stats = computed(() => ({
  total: pagination.total,
  loaded: dataList.value.length
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
  {
    label: "角色编码",
    prop: "role_code",
    width: 150,
    showOverflowTooltip: true
  },
  {
    label: "角色名称",
    prop: "role_name",
    width: 150,
    showOverflowTooltip: true
  },
  { label: "备注", prop: "remark", minWidth: 200, showOverflowTooltip: true },
  {
    label: "操作",
    slot: "operation",
    width: 240,
    fixed: "right",
    align: "center"
  }
];

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get("/sys/role/list", {
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
  localStorage.setItem("page-size-RoleList", String(v));
  pagination.pageSize = v;
  fetchData();
};
const handleCurrentChange = (v: number) => {
  pagination.currentPage = v;
  fetchData();
};

// ==================== 弹窗 ====================
const dialogVisible = ref(false);
const dialogTitle = ref("新增角色");
const saving = ref(false);
const form = reactive({
  id: null as number | null,
  role_code: "",
  role_name: "",
  remark: ""
});
const formRef = ref();
const formRules = {
  role_code: [{ required: true, message: "请输入角色编码", trigger: "blur" }],
  role_name: [{ required: true, message: "请输入角色名称", trigger: "blur" }]
};

function openDialog(row?: any) {
  if (row?.id) {
    dialogTitle.value = "编辑角色";
    Object.assign(form, {
      id: row.id,
      role_code: row.role_code,
      role_name: row.role_name,
      remark: row.remark || ""
    });
  } else {
    dialogTitle.value = "新增角色";
    Object.assign(form, { id: null, role_code: "", role_name: "", remark: "" });
  }
  dialogVisible.value = true;
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (form.id) {
      await api.put(`/sys/role/${form.id}`, { ...form });
    } else {
      await api.post("/sys/role", { ...form });
    }
    ElMessage.success(form.id ? "更新成功" : "创建成功");
    dialogVisible.value = false;
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "操作失败");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除角色「${row.role_name}」？`, "提示", {
    type: "warning"
  });
  await api.delete(`/sys/role/${row.id}`);
  ElMessage.success("删除成功");
  fetchData();
}

// ==================== 权限分配 ====================
const permVisible = ref(false);
const permSaving = ref(false);
const permTreeData = ref<any[]>([]);
const checkedPermIds = ref<number[]>([]);
const permTreeRef = ref();
const permDialogKey = ref(0);
let currentRoleId: number | null = null;

async function openPermission(row: any) {
  currentRoleId = row.id;
  try {
    const res = await api.get(`/sys/role/${row.id}/permissions`);
    console.log(
      "[openPermission] API 返回的完整 data:",
      JSON.stringify(res.data)
    );
    console.log("[openPermission] checkedPermIds:", res.data?.checkedPermIds);
    console.log(
      "[openPermission] checkedPermIds 类型:",
      res.data?.checkedPermIds?.map((v: any) => typeof v)
    );
    console.log(
      "[openPermission] permissionTree 节点 id 类型:",
      res.data?.permissionTree?.[0]
        ? typeof res.data.permissionTree[0].id
        : "tree为空"
    );
    permTreeData.value = res.data.permissionTree || [];
    checkedPermIds.value = res.data.checkedPermIds || [];
  } catch {
    /* empty */
  }
  console.log(
    "[openPermission] 赋值后 checkedPermIds.value:",
    checkedPermIds.value
  );
  permDialogKey.value++;
  permVisible.value = true;
  await nextTick();
  console.log(
    "[openPermission] setCheckedKeys 调用前 checkedPermIds.value:",
    checkedPermIds.value
  );
  console.log(
    "[openPermission] setCheckedKeys 前 treeRef:",
    !!permTreeRef.value
  );
  permTreeRef.value?.setCheckedKeys(checkedPermIds.value, false);
}

const permSearchText = ref("");
const permExpandAll = ref(false);

function filterPermNode(value: string, data: any) {
  if (!value) return true;
  return data.perm_name?.toLowerCase().includes(value.toLowerCase());
}

function countPermNodes(nodes: any[]): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.children?.length) count += countPermNodes(node.children);
  }
  return count;
}

watch(permSearchText, val => {
  permTreeRef.value?.filter(val);
});

function handlePermExpandAll() {
  permExpandAll.value = !permExpandAll.value;
  nextTick(() => {
    const nodes = permTreeRef.value?.store?.nodesMap || {};
    Object.keys(nodes).forEach(key => {
      nodes[key].expanded = permExpandAll.value;
    });
  });
}

async function handleSavePerm() {
  permSaving.value = true;
  try {
    const checked = permTreeRef.value?.getCheckedKeys() || [];
    const halfChecked = permTreeRef.value?.getHalfCheckedKeys?.() || [];
    const permIds = [...checked, ...halfChecked];
    console.log("[handleSavePerm] 提交的 permIds:", permIds);
    console.log(
      "[handleSavePerm] checked:",
      checked,
      "halfChecked:",
      halfChecked
    );
    await api.put(`/sys/role/${currentRoleId}/permissions`, {
      perm_ids: permIds
    });
    // 同步本地状态，防止下次打开弹窗闪烁旧数据
    checkedPermIds.value = permIds;
    ElMessage.success("权限分配成功");
    permVisible.value = false;
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "操作失败");
  } finally {
    permSaving.value = false;
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
            label: '角色总数',
            value: stats.total,
            color: 'var(--el-color-primary)',
            icon: Shield
          },
          { label: '已加载', value: stats.loaded, color: '#67c23a', icon: Key },
          {
            label: '页面',
            value: `第 ${pagination.currentPage} 页`,
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
            placeholder="搜索角色编码 / 名称..."
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
            >新增角色</el-button
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
          个角色
        </span>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <PureTableBar
      title="角色管理"
      :columns="columns"
      storage-key="RoleList"
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
              title="暂无角色数据"
              description="点击「新增角色」创建"
            />
          </template>
          <template #operation="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)"
              >编辑</el-button
            >
            <el-button
              link
              type="primary"
              size="small"
              @click="openPermission(row)"
              >分配权限</el-button
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
      width="500px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="角色编码" prop="role_code">
          <el-input v-model="form.role_code" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="角色名称" prop="role_name">
          <el-input v-model="form.role_name" />
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

    <el-dialog
      :key="'permDlg-' + permDialogKey"
      v-model="permVisible"
      title="分配权限"
      width="700px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div class="mb-3 flex items-center gap-3">
        <el-input
          v-model="permSearchText"
          placeholder="搜索权限..."
          clearable
          :prefix-icon="useRenderIcon(Search)"
          class="w-56!"
        />
        <el-button size="small" @click="handlePermExpandAll">
          {{ permExpandAll ? "折叠全部" : "展开全部" }}
        </el-button>
        <div class="flex-1" />
        <span
          class="text-xs"
          :style="{ color: 'var(--el-text-color-secondary)' }"
        >
          已选 {{ checkedPermIds.length }} / 共
          {{ countPermNodes(permTreeData) }} 项
        </span>
      </div>
      <el-scrollbar max-height="50vh">
        <el-tree
          ref="permTreeRef"
          :data="permTreeData"
          show-checkbox
          node-key="id"
          :default-checked-keys="checkedPermIds"
          :filter-node-method="filterPermNode"
          :props="{ label: 'perm_name', children: 'children' }"
        />
      </el-scrollbar>
      <template #footer>
        <el-button @click="permVisible = false">取消</el-button>
        <el-button type="primary" :loading="permSaving" @click="handleSavePerm"
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

:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}

:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}
</style>

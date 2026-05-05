<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";

import Search from "~icons/ep/search";
import Refresh from "~icons/ep/refresh";
import EditPen from "~icons/ep/edit-pen";
import Delete from "~icons/ep/delete";
import Plus from "~icons/ep/plus";

import Folder3Line from "~icons/ri/folder-3-line";
import FileList3Line from "~icons/ri/file-list-3-line";
import FolderOpened from "~icons/ep/folder-opened";

defineOptions({ name: "ProductCategory" });

const searchForm = reactive({ keyword: "" });
const treeData = ref([]);
const allData = ref<any[]>([]);
const loading = ref(false);

const parentTree = computed(() => {
  const build = (list: any[], pid = 0): any[] =>
    list
      .filter(x => x.parent_id === pid)
      .map(x => ({ ...x, children: build(list, x.id) }));
  return build(allData.value, 0);
});

function flattenTree(tree: any[], result: any[] = []): any[] {
  tree.forEach(node => {
    result.push({ ...node, children: undefined });
    if (node.children) flattenTree(node.children, result);
  });
  return result;
}

const statsCards = computed(() => [
  { label: "分类总数", value: allData.value.length, color: "var(--el-color-primary)", icon: Folder3Line },
  { label: "一级分类", value: treeData.value.length, color: "#67c23a", icon: FileList3Line },
  { label: "本页", value: allData.value.length, color: "var(--el-color-info)", icon: FolderOpened }
]);

const columns: any[] = [
  { label: "分类名称", prop: "category_name", minWidth: 240, align: "left" },
  { label: "排序", prop: "sort_order", width: 100, align: "center" },
  {
    label: "操作",
    slot: "operation",
    width: 150,
    align: "center",
    fixed: "right"
  }
];

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get("/product/category/tree", {
      params: { keyword: searchForm.keyword || undefined }
    });
    treeData.value = res.data;
    allData.value = flattenTree(res.data);
  } finally {
    loading.value = false;
  }
}

const onSearch = () => fetchData();
const resetForm = () => {
  searchForm.keyword = "";
  fetchData();
};

const dialogVisible = ref(false);
const dialogTitle = ref("新增分类");
const saving = ref(false);
const form = reactive({
  id: null as number | null,
  category_name: "",
  parent_id: 0 as number | null,
  sort_order: 0
});
const formRef = ref();
const formRules = {
  category_name: [
    { required: true, message: "请输入分类名称", trigger: "blur" }
  ]
};

function openDialog(row?: any) {
  if (row?.id) {
    dialogTitle.value = "编辑分类";
    Object.assign(form, {
      id: row.id,
      category_name: row.category_name,
      parent_id: row.parent_id ?? 0,
      sort_order: row.sort_order ?? 0
    });
  } else {
    dialogTitle.value = "新增分类";
    Object.assign(form, {
      id: null,
      category_name: "",
      parent_id: 0,
      sort_order: 0
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
      await api.put(`/product/category/${form.id}`, { ...form });
    } else {
      await api.post("/product/category", { ...form });
    }
    ElMessage.success(form.id ? "修改成功" : "新增成功");
    dialogVisible.value = false;
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(
    `确定删除「${row.category_name}」吗？删除后子分类将一并移除。`,
    "删除确认",
    {
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
      type: "warning"
    }
  );
  await api.delete(`/product/category/${row.id}`);
  ElMessage.success("删除成功");
  fetchData();
}

function onParentClear() {
  form.parent_id = 0;
}

onMounted(fetchData);
</script>

<template>
  <div class="p-5">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in statsCards"
        :key="card.label"
        class="wms-card flex-1 flex items-center gap-3"
        :style="{ padding: '16px 20px' }"
      >
        <div class="flex items-center justify-center rounded-lg" :style="{ width: '40px', height: '40px', background: card.color + '15', color: card.color }">
          <el-icon :size="20"><component :is="useRenderIcon(card.icon)" /></el-icon>
        </div>
        <div>
          <div class="text-xs" :style="{ color: 'var(--el-text-color-secondary)' }">{{ card.label }}</div>
          <div class="text-xl font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">{{ card.value }}</div>
        </div>
      </div>
    </div>

    <!-- 筛选条件卡片 -->
    <div
      class="wms-card mb-4"
      :style="{ padding: '20px 24px' }"
    >
      <div
        class="flex items-center gap-2 mb-4 text-sm font-semibold"
        :style="{ color: 'var(--el-text-color-primary)' }"
      >
        <span
          class="inline-block w-1 h-4 rounded"
          :style="{ background: 'var(--el-color-primary)' }"
        />
        筛选条件
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <el-form :inline="true" :model="searchForm" class="mb-0!">
          <el-form-item label="关键词" class="mb-0!">
            <el-input
              v-model="searchForm.keyword"
              placeholder="搜索分类名称"
              clearable
              :prefix-icon="useRenderIcon(Search)"
              class="w-56!"
              @keyup.enter="onSearch"
            />
          </el-form-item>
        </el-form>
        <el-divider direction="vertical" class="h-6!" />
        <div class="flex items-center gap-2">
          <el-button
            type="primary"
            :icon="useRenderIcon(Search)"
            :loading="loading"
            size="default"
            @click="onSearch"
            >查询</el-button
          >
          <el-button
            :icon="useRenderIcon(Refresh)"
            size="default"
            @click="resetForm"
            >重置</el-button
          >
        </div>
        <el-divider direction="vertical" class="h-6!" />
        <el-button
          type="primary"
          :icon="useRenderIcon(Plus)"
          size="default"
          @click="openDialog()"
          >新增分类</el-button
        >
      </div>
    </div>

    <!-- 表格卡片 -->
    <PureTableBar title="商品分类" :columns="columns" storage-key="ProductCategory" @refresh="onSearch">
      <template v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }">
        <pure-table :key="tableRefreshKey"
          @header-dragend="(newWidth, _oldWidth, col) => onColumnResize(col.label || col.property, newWidth)"
          row-key="id"
          border
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="left"
         
          stripe
          :loading="loading"
          :size="size"
          :data="treeData"
          :columns="dynamicColumns"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
          default-expand-all
          :indent="24"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)',
            fontWeight: 600,
            height: '48px'
          }"
        >
          <template #empty>
            <EmptyState title="暂无分类数据" description="调整筛选条件或点击新增" />
          </template>
          <template #operation="{ row }">
            <div class="flex gap-2">
              <el-button
                link
                type="primary"
                size="small"
                :icon="useRenderIcon(EditPen)"
                @click="openDialog(row)"
                >编辑</el-button
              >
              <el-button
                link
                type="danger"
                size="small"
                :icon="useRenderIcon(Delete)"
                @click="handleDelete(row)"
                >删除</el-button
              >
            </div>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 新增/编辑弹窗 -->
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
        <el-form-item label="分类名称" prop="category_name">
          <el-input
            v-model="form.category_name"
            placeholder="请输入分类名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="父级分类">
          <el-tree-select
            v-model="form.parent_id"
            :data="parentTree"
            :props="{
              label: 'category_name',
              value: 'id',
              children: 'children'
            }"
            placeholder="无（顶级分类）"
            clearable
            check-strictly
            class="w-full!"
            @clear="onParentClear"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="form.sort_order"
            :min="0"
            :max="9999"
            controls-position="right"
            class="w-40!"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave"
            >保存</el-button
          >
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.operation-btn {
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}

.operation-btn:hover {
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
  transform: scale(1.1);
}

:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}
:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}
</style>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";

import Search from "~icons/ep/search";
import Refresh from "~icons/ep/refresh";
import Plus from "~icons/ep/plus";
import EditPen from "~icons/ep/edit-pen";
import Delete from "~icons/ep/delete";

import TruckLine from "~icons/ri/truck-line";
import CheckboxCircleLine from "~icons/ri/checkbox-circle-line";
import User from "~icons/ep/user";

defineOptions({ name: "Supplier" });

const searchForm = reactive({ keyword: "" });
const dataList = ref([]);
const loading = ref(false);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-Supplier")) || 20,
  currentPage: 1,
  background: true
});
const supplierTypeOptions = ref<any[]>([]);
const supplierLevelOptions = ref<any[]>([]);
const cooperationStatusOptions = ref<any[]>([]);

const statsCards = computed(() => [
  { label: "供应商总数", value: pagination.total, color: "var(--el-color-primary)", icon: TruckLine },
  { label: "启用", value: dataList.value.filter((item: any) => item.is_enabled === 1).length, color: "#67c23a", icon: CheckboxCircleLine },
  { label: "本页", value: dataList.value.length, color: "var(--el-color-info)", icon: User }
]);

const columns: any[] = [
  { type: "index", label: "#", width: 50, align: "center", fixed: "left" },
  { label: "编码", prop: "supplier_code", width: 140, align: "left" },
  { label: "名称", prop: "supplier_name", minWidth: 160, align: "left" },
  { label: "简称", prop: "supplier_short", width: 120, align: "left" },
  { label: "联系人", prop: "contact_person", width: 100, align: "left" },
  { label: "电话", prop: "contact_phone", width: 130, align: "left" },
  {
    label: "邮箱",
    prop: "contact_email",
    minWidth: 180,
    align: "left",
    showOverflowTooltip: true
  },
  {
    label: "类型",
    prop: "supplier_type",
    slot: "supplier_type",
    width: 100,
    align: "center"
  },
  { label: "等级", prop: "level", slot: "level", width: 70, align: "center" },
  {
    label: "合作状态",
    prop: "cooperation_status",
    slot: "cooperation_status",
    width: 100,
    align: "center"
  },
  {
    label: "启用",
    prop: "is_enabled",
    slot: "is_enabled",
    width: 70,
    align: "center"
  },
  {
    label: "备注",
    prop: "remark",
    minWidth: 180,
    align: "left",
    showOverflowTooltip: true
  },
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
    const res = await api.get("/supplier/list", {
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
    localStorage.setItem("page-size-Supplier", String(v));
  pagination.pageSize = v;
  fetchData();
};
const handleCurrentChange = (v: number) => {
  pagination.currentPage = v;
  fetchData();
};

const dialogVisible = ref(false);
const dialogTitle = ref("新增供应商");
const saving = ref(false);
const form = reactive({
  id: null as number | null,
  supplier_code: "",
  supplier_name: "",
  supplier_short: "",
  contact_person: "",
  contact_phone: "",
  contact_email: "",
  supplier_type: "",
  level: "A",
  cooperation_status: "合作中",
  is_enabled: 1,
  remark: ""
});
const formRef = ref();
const formRules = {
  supplier_name: [
    { required: true, message: "请输入供应商名称", trigger: "blur" }
  ]
};

function openDialog(row?: any) {
  if (row?.id) {
    dialogTitle.value = "编辑供应商";
    Object.assign(form, { ...row });
  } else {
    dialogTitle.value = "新增供应商";
    Object.assign(form, {
      id: null,
      supplier_code: "",
      supplier_name: "",
      supplier_short: "",
      contact_person: "",
      contact_phone: "",
      contact_email: "",
      supplier_type: "",
      level: "A",
      cooperation_status: "合作中",
      is_enabled: 1,
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
      await api.put(`/supplier/${form.id}`, { ...form });
    } else {
      await api.post("/supplier", { ...form });
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
    `确定删除「${row.supplier_name}」吗？`,
    "删除确认",
    { confirmButtonText: "确定删除", cancelButtonText: "取消", type: "warning" }
  );
  await api.delete(`/supplier/${row.id}`);
  ElMessage.success("删除成功");
  fetchData();
}

async function loadDict() {
  try {
    const [types, levels, statuses] = await Promise.all([
      api.get("/sys/dict/data/supplier_type"),
      api.get("/sys/dict/data/supplier_level"),
      api.get("/sys/dict/data/cooperation_status")
    ]);
    supplierTypeOptions.value = (types.data || []).map((d: any) => ({
      label: d.dict_label,
      value: d.dict_value
    }));
    supplierLevelOptions.value = (levels.data || []).map((d: any) => ({
      label: d.dict_label,
      value: d.dict_value
    }));
    cooperationStatusOptions.value = (statuses.data || []).map((d: any) => ({
      label: d.dict_label,
      value: d.dict_value
    }));
  } catch {
    /* empty */
  }
}

onMounted(() => {
  fetchData();
  loadDict();
});
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
              placeholder="搜索编码/名称/简称"
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
          >新增供应商</el-button
        >
      </div>
    </div>

    <!-- 表格卡片 -->
    <PureTableBar title="供应商管理" :columns="columns" storage-key="Supplier" @refresh="onSearch">
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
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="{ ...pagination, size }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)',
            fontWeight: 600,
            height: '48px'
          }"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #empty>
            <EmptyState title="暂无供应商数据" description="调整筛选条件或点击新增" />
          </template>
          <template #supplier_type="{ row }">
            <el-tag
              v-if="row.supplier_type"
              effect="plain"
              type="info"
              size="small"
              >{{ row.supplier_type }}</el-tag
            >
            <span v-else>-</span>
          </template>
          <template #level="{ row }">
            <el-tag
              effect="plain"
              :type="
                row.level === 'A'
                  ? 'success'
                  : row.level === 'B'
                    ? 'warning'
                    : 'info'
              "
              size="small"
              >{{ row.level || "-" }}</el-tag
            >
          </template>
          <template #cooperation_status="{ row }">
            <el-tag
              effect="plain"
              :type="
                row.cooperation_status === '合作中'
                  ? 'success'
                  : row.cooperation_status === '已终止'
                    ? 'danger'
                    : 'warning'
              "
              size="small"
              >{{ row.cooperation_status || "-" }}</el-tag
            >
          </template>
          <template #is_enabled="{ row }">
            <el-tag
              effect="plain"
              :type="row.is_enabled === 1 ? 'success' : 'info'"
              size="small"
              >{{ row.is_enabled === 1 ? "启用" : "停用" }}</el-tag
            >
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
      width="650px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-row :gutter="16">
          <el-col :span="12"
            ><el-form-item label="编码"
              ><el-input
                :model-value="form.supplier_code || '系统自动生成'"
                disabled /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="名称" prop="supplier_name"
              ><el-input
                v-model="form.supplier_name"
                placeholder="请输入供应商名称" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="简称"
              ><el-input
                v-model="form.supplier_short"
                placeholder="请输入供应商简称" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="联系人"
              ><el-input
                v-model="form.contact_person"
                placeholder="请输入联系人" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="电话"
              ><el-input
                v-model="form.contact_phone"
                placeholder="请输入联系电话" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="邮箱"
              ><el-input
                v-model="form.contact_email"
                placeholder="请输入联系邮箱" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="类型"
              ><el-select
                v-model="form.supplier_type"
                clearable
                placeholder="请选择类型"
                class="w-full!"
                ><el-option
                  v-for="o in supplierTypeOptions"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="等级"
              ><el-select v-model="form.level" class="w-full!"
                ><el-option
                  v-for="o in supplierLevelOptions"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="合作状态"
              ><el-select v-model="form.cooperation_status" class="w-full!"
                ><el-option
                  v-for="o in cooperationStatusOptions"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="启用"
              ><el-switch
                v-model="form.is_enabled"
                :active-value="1"
                :inactive-value="0" /></el-form-item
          ></el-col>
          <el-col :span="24"
            ><el-form-item label="备注"
              ><el-input
                v-model="form.remark"
                type="textarea"
                :rows="2"
                placeholder="请输入备注信息" /></el-form-item
          ></el-col>
        </el-row>
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

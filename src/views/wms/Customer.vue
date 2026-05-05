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

import TeamLine from "~icons/ri/team-line";
import CheckboxCircleLine from "~icons/ri/checkbox-circle-line";
import UserFilled from "~icons/ep/user-filled";

defineOptions({ name: "Customer" });

const searchForm = reactive({ keyword: "" });
const dataList = ref([]);
const loading = ref(false);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-Customer")) || 20,
  currentPage: 1,
  background: true
});
const customerLevelOptions = ref<any[]>([]);

const statsCards = computed(() => [
  { label: "客户总数", value: pagination.total, color: "var(--el-color-primary)", icon: TeamLine },
  { label: "活跃", value: dataList.value.filter((item: any) => item.customer_level === 'A').length, color: "#67c23a", icon: CheckboxCircleLine },
  { label: "本页", value: dataList.value.length, color: "var(--el-color-info)", icon: UserFilled }
]);

const columns: any[] = [
  { type: "index", label: "#", width: 50, align: "center", fixed: "left" },
  { label: "编码", prop: "customer_code", width: 140, align: "left" },
  { label: "名称", prop: "customer_name", minWidth: 160, align: "left" },
  {
    label: "地址",
    prop: "address",
    minWidth: 200,
    align: "left",
    showOverflowTooltip: true
  },
  { label: "联系人", prop: "contact_person", width: 100, align: "left" },
  { label: "电话", prop: "contact_phone", width: 130, align: "left" },
  {
    label: "信用额度",
    prop: "credit_limit",
    slot: "credit_limit",
    width: 120,
    align: "right"
  },
  {
    label: "等级",
    prop: "customer_level",
    slot: "customer_level",
    width: 80,
    align: "center"
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
    const res = await api.get("/customer/list", {
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
    localStorage.setItem("page-size-Customer", String(v));
  pagination.pageSize = v;
  fetchData();
};
const handleCurrentChange = (v: number) => {
  pagination.currentPage = v;
  fetchData();
};

const dialogVisible = ref(false);
const dialogTitle = ref("新增客户");
const saving = ref(false);
const form = reactive({
  id: null as number | null,
  customer_code: "",
  customer_name: "",
  address: "",
  contact_person: "",
  contact_phone: "",
  credit_limit: null as number | null,
  customer_level: "A"
});
const formRef = ref();
const formRules = {
  customer_name: [
    { required: true, message: "请输入客户名称", trigger: "blur" }
  ]
};

function openDialog(row?: any) {
  if (row?.id) {
    dialogTitle.value = "编辑客户";
    Object.assign(form, { ...row, id: row.id });
  } else {
    dialogTitle.value = "新增客户";
    Object.assign(form, {
      id: null,
      customer_code: "",
      customer_name: "",
      address: "",
      contact_person: "",
      contact_phone: "",
      credit_limit: null,
      customer_level: "A"
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
      await api.put(`/customer/${form.id}`, { ...form });
    } else {
      await api.post("/customer", { ...form });
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
    `确定删除「${row.customer_name}」吗？`,
    "删除确认",
    { confirmButtonText: "确定删除", cancelButtonText: "取消", type: "warning" }
  );
  await api.delete(`/customer/${row.id}`);
  ElMessage.success("删除成功");
  fetchData();
}

async function loadDict() {
  try {
    const res = await api.get("/sys/dict/data/customer_level");
    customerLevelOptions.value = (res.data || []).map((d: any) => ({
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
              placeholder="搜索客户编码/名称"
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
          >新增客户</el-button
        >
      </div>
    </div>

    <!-- 表格卡片 -->
    <PureTableBar title="客户管理" :columns="columns" storage-key="Customer" @refresh="onSearch">
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
            <EmptyState title="暂无客户数据" description="调整筛选条件或点击新增" />
          </template>
          <template #credit_limit="{ row }">
            {{
              row.credit_limit != null
                ? Number(row.credit_limit).toFixed(2)
                : "-"
            }}
          </template>
          <template #customer_level="{ row }">
            <el-tag
              effect="plain"
              :type="
                row.customer_level === 'A'
                  ? 'success'
                  : row.customer_level === 'B'
                    ? 'warning'
                    : 'info'
              "
              size="small"
            >
              {{ row.customer_level || "-" }}
            </el-tag>
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
      width="640px"
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
            ><el-form-item label="客户编码"
              ><el-input
                v-model="form.customer_code"
                disabled
                placeholder="系统自动生成" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="客户名称" prop="customer_name"
              ><el-input
                v-model="form.customer_name"
                placeholder="请输入客户名称" /></el-form-item
          ></el-col>
          <el-col :span="24"
            ><el-form-item label="地址"
              ><el-input
                v-model="form.address"
                placeholder="请输入地址" /></el-form-item
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
            ><el-form-item label="信用额度"
              ><el-input-number
                v-model="form.credit_limit"
                :min="0"
                :precision="2"
                controls-position="right"
                class="w-full!" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="等级"
              ><el-select v-model="form.customer_level" class="w-full!"
                ><el-option
                  v-for="o in customerLevelOptions"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value" /></el-select></el-form-item
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

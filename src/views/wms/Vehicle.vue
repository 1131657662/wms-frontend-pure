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
import Upload from "~icons/ep/upload";
import Download from "~icons/ep/download";

import CarLine from "~icons/ri/car-line";
import CheckboxCircleLine from "~icons/ri/checkbox-circle-line";
import Van from "~icons/ep/van";

defineOptions({ name: "Vehicle" });

const searchForm = reactive({ keyword: "" });
const dataList = ref([]);
const loading = ref(false);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-Vehicle")) || 20,
  currentPage: 1,
  background: true
});

const statusMap = reactive<Record<number, { label: string; type: string }>>({});
const statusOptions = ref<{ label: string; value: number }[]>([]);

async function loadStatusDict() {
  try {
    const res = await api.get("/sys/dict/data/vehicle_status");
    const list = res.data || [];
    statusOptions.value = list.map((d: any) => ({
      label: d.dict_label,
      value: Number(d.dict_value)
    }));
    for (const d of list) {
      statusMap[Number(d.dict_value)] = {
        label: d.dict_label,
        type: d.remark || "info"
      };
    }
  } catch { /* 字典加载失败 */ }
}

const statsCards = computed(() => [
  { label: "车辆总数", value: pagination.total, color: "var(--el-color-primary)", icon: CarLine },
  { label: "启用", value: dataList.value.filter((item: any) => item.status === 1).length, color: "#67c23a", icon: CheckboxCircleLine },
  { label: "本页", value: dataList.value.length, color: "var(--el-color-info)", icon: Van }
]);

const columns: any[] = [
  { type: "index", label: "#", width: 50, align: "center", fixed: "left" },
  { label: "车牌号", prop: "plate_number", width: 140, align: "left" },
  { label: "联系人", prop: "contact_name", width: 110, align: "left" },
  { label: "电话", prop: "contact_phone", width: 140, align: "left" },
  { label: "状态", prop: "status", slot: "status", width: 90, align: "center" },
  {
    label: "备注",
    prop: "remark",
    minWidth: 200,
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
    const res = await api.get("/vehicle/list", {
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
    localStorage.setItem("page-size-Vehicle", String(v));
  pagination.pageSize = v;
  fetchData();
};
const handleCurrentChange = (v: number) => {
  pagination.currentPage = v;
  fetchData();
};

const dialogVisible = ref(false);
const dialogTitle = ref("新增车辆");
const saving = ref(false);
const form = reactive({
  id: null as number | null,
  plate_number: "",
  contact_name: "",
  contact_phone: "",
  status: 1,
  remark: ""
});
const formRef = ref();
const formRules = {
  plate_number: [{ required: true, message: "请输入车牌号", trigger: "blur" }]
};

function openDialog(row?: any) {
  if (row?.id) {
    dialogTitle.value = "编辑车辆";
    Object.assign(form, {
      id: row.id,
      plate_number: row.plate_number,
      contact_name: row.contact_name || "",
      contact_phone: row.contact_phone || "",
      status: row.status,
      remark: row.remark || ""
    });
  } else {
    dialogTitle.value = "新增车辆";
    Object.assign(form, {
      id: null,
      plate_number: "",
      contact_name: "",
      contact_phone: "",
      status: 1,
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
      await api.put(`/vehicle/${form.id}`, { ...form });
    } else {
      await api.post("/vehicle", { ...form });
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
    `确定删除「${row.plate_number}」吗？`,
    "删除确认",
    { confirmButtonText: "确定删除", cancelButtonText: "取消", type: "warning" }
  );
  await api.delete(`/vehicle/${row.id}`);
  ElMessage.success("删除成功");
  fetchData();
}

// ========== 导入 ==========
const importDialogVisible = ref(false);
const importing = ref(false);
const importResult = ref<any>(null);
const importFile = ref<File | null>(null);

function handleFileChange(file: any) {
  importFile.value = file.raw || file;
}

async function handleDownloadTemplate() {
  try {
    const resp = await api.get("/vehicle/template", { responseType: "blob" });
    const url = URL.createObjectURL(resp as any);
    const a = document.createElement("a");
    a.href = url;
    a.download = "车辆导入模板.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    ElMessage.error("模板下载失败");
  }
}

async function handleImport() {
  if (!importFile.value) {
    ElMessage.warning("请选择 Excel 文件");
    return;
  }
  importing.value = true;
  importResult.value = null;
  try {
    const fd = new FormData();
    fd.append("file", importFile.value);
    const res = await api.post("/vehicle/import", fd, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    importResult.value = res.data;
    if (res.data.successCount > 0) fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "导入失败");
  } finally {
    importing.value = false;
  }
}

onMounted(() => { loadStatusDict(); fetchData(); });
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
              placeholder="搜索车牌号/联系人"
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
          >新增车辆</el-button
        >
        <el-button
          type="success"
          :icon="useRenderIcon(Upload)"
          size="default"
          @click="importDialogVisible = true"
          >批量导入</el-button
        >
      </div>
    </div>

    <!-- 表格卡片 -->
    <PureTableBar title="车辆管理" :columns="columns" storage-key="Vehicle" @refresh="onSearch">
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
            <EmptyState title="暂无车辆数据" description="调整筛选条件或点击新增" />
          </template>
          <template #status="{ row }">
            <el-tag
              effect="plain"
              :type="statusMap[row.status]?.type || 'info'"
              size="small"
            >
              {{ statusMap[row.status]?.label || row.status }}
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
      width="520px"
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
            ><el-form-item label="车牌号" prop="plate_number"
              ><el-input
                v-model="form.plate_number"
                placeholder="请输入车牌号" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="联系人"
              ><el-input
                v-model="form.contact_name"
                placeholder="请输入联系人" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="电话"
              ><el-input
                v-model="form.contact_phone"
                placeholder="请输入联系电话" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="状态"
              ><el-select v-model="form.status" class="w-full!"
                ><el-option
                  v-for="o in statusOptions"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value" /></el-select></el-form-item
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

    <!-- 批量导入弹窗 -->
    <el-dialog
      v-model="importDialogVisible"
      title="批量导入车辆"
      width="520px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div class="flex items-center gap-3 mb-4">
        <el-button plain :icon="useRenderIcon(Download)" @click="handleDownloadTemplate">
          下载导入模板
        </el-button>
      </div>
      <el-upload
        drag
        :auto-upload="false"
        :on-change="handleFileChange"
        :limit="1"
        accept=".xlsx,.xls"
      >
        <el-icon class="text-3xl" :style="{ color: 'var(--el-text-color-secondary)' }">
          <component :is="useRenderIcon(Upload)" />
        </el-icon>
        <div class="mt-2 text-sm" :style="{ color: 'var(--el-text-color-secondary)' }">
          将 Excel 文件拖拽到此处，或<em :style="{ color: 'var(--el-color-primary)' }">点击上传</em>
        </div>
        <template #tip>
          <div class="mt-1 text-xs" :style="{ color: 'var(--el-text-color-placeholder)' }">
            仅支持 .xlsx / .xls 格式
          </div>
        </template>
      </el-upload>

      <div v-if="importResult" class="mt-4">
        <el-alert
          :title="`导入完成：成功 ${importResult.successCount} 条，失败 ${importResult.failCount} 条`"
          :type="importResult.failCount > 0 ? 'warning' : 'success'"
          :closable="false"
          show-icon
        />
        <div v-if="importResult.errors && importResult.errors.length > 0" class="mt-3">
          <div class="text-sm font-medium mb-2" :style="{ color: 'var(--el-text-color-primary)' }">失败明细：</div>
          <div
            v-for="(err, i) in importResult.errors"
            :key="i"
            class="text-xs mb-1"
            :style="{ color: 'var(--el-color-danger)' }"
          >
            第 {{ err.row }} 行：{{ err.errors.join('；') }}
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false">关闭</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">开始导入</el-button>
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

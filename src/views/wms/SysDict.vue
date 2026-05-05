<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";

import Folder from "~icons/ri/folder-3-line";
import FileList from "~icons/ri/file-list-3-line";
import CheckLine from "~icons/ri/checkbox-circle-line";
import Search from "~icons/ri/search-line";

defineOptions({ name: "SysDict" });

const typeLoading = ref(false);
const dataLoading = ref(false);
const saving = ref(false);
const typeList = ref<any[]>([]);
const dataList = ref<any[]>([]);
const currentType = ref<any>(null);
const dataSearch = ref("");

const typeDialogVisible = ref(false);
const dataDialogVisible = ref(false);

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

// ==================== 统计 ====================
const filteredDataList = computed(() => {
  if (!dataSearch.value) return dataList.value;
  const kw = dataSearch.value.toLowerCase();
  return dataList.value.filter(
    (item: any) =>
      item.dict_label?.toLowerCase().includes(kw) ||
      item.dict_value?.toLowerCase().includes(kw)
  );
});

const stats = computed(() => ({
  types: typeList.value.length,
  items: dataList.value.length,
  enabled: dataList.value.filter((item: any) => item.is_enabled).length
}));

// ==================== 列定义 ====================
const typeColumns: any[] = [
  { label: "字典名称", prop: "dict_name", minWidth: 120, showOverflowTooltip: true },
  { label: "字典编码", prop: "dict_code", minWidth: 120, showOverflowTooltip: true },
  { label: "操作", slot: "operation", width: 120, align: "center" }
];

const dataColumns: any[] = [
  { type: "index", label: "#", width: 56 },
  { label: "显示文本", prop: "dict_label", minWidth: 120, showOverflowTooltip: true },
  { label: "取值", prop: "dict_value", width: 120 },
  { label: "排序", prop: "sort_order", width: 70, align: "center" },
  { label: "启用", slot: "is_enabled", width: 70, align: "center" },
  { label: "备注", prop: "remark", minWidth: 100, showOverflowTooltip: true },
  { label: "操作", slot: "operation", width: 120, align: "center" }
];

// ==================== 表单 ====================
const typeForm = reactive({
  id: null as number | null, dict_code: "", dict_name: "", remark: ""
});
const typeFormRef = ref();
const typeRules = {
  dict_code: [{ required: true, message: "请输入字典编码", trigger: "blur" }],
  dict_name: [{ required: true, message: "请输入字典名称", trigger: "blur" }]
};

const dataForm = reactive({
  id: null as number | null, dict_type_code: "", dict_label: "",
  dict_value: "", sort_order: 0, is_enabled: 1, remark: ""
});
const dataFormRef = ref();
const dataRules = {
  dict_label: [{ required: true, message: "请输入显示文本", trigger: "blur" }],
  dict_value: [{ required: true, message: "请输入取值", trigger: "blur" }]
};

// ==================== 数据操作 ====================
async function loadTypes() {
  typeLoading.value = true;
  try { typeList.value = ((await api.get("/sys/dict/type/list")).data.list || []); }
  finally { typeLoading.value = false; }
}

async function loadData() {
  if (!currentType.value) { dataList.value = []; return; }
  dataLoading.value = true;
  try {
    const res = await api.get("/sys/dict/data/list", { params: { dict_type_code: currentType.value.dict_code } });
    dataList.value = res.data.list || [];
  } finally { dataLoading.value = false; }
}

function onTypeClick(row: any) {
  currentType.value = row;
  dataSearch.value = "";
  loadData();
}

// ==================== 字典类型 CRUD ====================
function openTypeDialog(row?: any) {
  if (row) {
    Object.assign(typeForm, { id: row.id, dict_code: row.dict_code, dict_name: row.dict_name, remark: row.remark || "" });
  } else {
    Object.assign(typeForm, { id: null, dict_code: "", dict_name: "", remark: "" });
  }
  typeDialogVisible.value = true;
}

async function handleSaveType() {
  const valid = await typeFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (typeForm.id) {
      await api.put(`/sys/dict/type/${typeForm.id}`, { ...typeForm });
    } else {
      await api.post("/sys/dict/type", { ...typeForm });
    }
    ElMessage.success(typeForm.id ? "更新成功" : "创建成功");
    typeDialogVisible.value = false;
    loadTypes();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "操作失败");
  } finally { saving.value = false; }
}

async function handleDeleteType(row: any) {
  await ElMessageBox.confirm(`确定删除字典类型「${row.dict_name}」？相关数据也将删除。`, "提示", { type: "warning" });
  await api.delete(`/sys/dict/type/${row.id}`);
  ElMessage.success("删除成功");
  if (currentType.value?.id === row.id) { currentType.value = null; dataList.value = []; }
  loadTypes();
}

// ==================== 字典数据 CRUD ====================
function openDataDialog(row?: any) {
  if (row) {
    Object.assign(dataForm, {
      id: row.id, dict_type_code: row.dict_type_code, dict_label: row.dict_label,
      dict_value: row.dict_value, sort_order: row.sort_order ?? 0,
      is_enabled: row.is_enabled, remark: row.remark || ""
    });
  } else {
    Object.assign(dataForm, {
      id: null, dict_type_code: currentType.value.dict_code,
      dict_label: "", dict_value: "", sort_order: 0, is_enabled: 1, remark: ""
    });
  }
  dataDialogVisible.value = true;
}

async function handleSaveData() {
  const valid = await dataFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (dataForm.id) {
      await api.put(`/sys/dict/data/${dataForm.id}`, { ...dataForm });
    } else {
      await api.post("/sys/dict/data", { ...dataForm });
    }
    ElMessage.success(dataForm.id ? "更新成功" : "创建成功");
    dataDialogVisible.value = false;
    loadData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "操作失败");
  } finally { saving.value = false; }
}

async function handleDeleteData(row: any) {
  await ElMessageBox.confirm(`确定删除数据项「${row.dict_label}」？`, "提示", { type: "warning" });
  await api.delete(`/sys/dict/data/${row.id}`);
  ElMessage.success("删除成功");
  loadData();
}

onMounted(loadTypes);
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          { label: '字典类型', value: stats.types, color: 'var(--el-color-primary)', icon: Folder },
          { label: '数据项', value: currentType ? stats.items : '—', color: '#67c23a', icon: FileList },
          { label: '已启用', value: currentType ? stats.enabled : '—', color: 'var(--el-color-info)', icon: CheckLine }
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

    <div class="flex gap-4">
      <!-- 左侧：字典类型 -->
      <div class="flex-1 min-w-0">
        <div
          class="wms-card"
        >
          <div
            class="flex items-center justify-between flex-wrap gap-2"
            :style="{ padding: '14px 20px', borderBottom: '1px solid var(--el-border-color-lighter)' }"
          >
            <div class="flex items-center gap-2 text-sm font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">
              <span class="inline-block w-1 h-4 rounded" :style="{ background: 'var(--el-color-primary)' }" />
              字典类型
            </div>
            <el-button type="primary" size="small" @click="openTypeDialog()">新增</el-button>
          </div>
          <div :style="{ padding: '0 20px 16px' }">
            <pure-table
              @header-dragend="(newWidth, _oldWidth, col) => onColumnResize(col.label || col.property, newWidth)"
              row-key="id"
              border
              adaptive
              :adaptiveConfig="{ offsetBottom: 60 }"
              align-whole="left"
             
              :loading="typeLoading"
              :data="typeList"
              :columns="typeColumns"
              :header-cell-style="headerCellStyle"
              highlight-current-row
              @row-click="onTypeClick"
            >
              <template #empty>
                <EmptyState title="暂无字典类型" :image-size="60" />
              </template>
              <template #operation="{ row }">
                <el-button link type="primary" size="small" @click.stop="openTypeDialog(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click.stop="handleDeleteType(row)">删除</el-button>
              </template>
            </pure-table>
          </div>
        </div>
      </div>

      <!-- 右侧：字典数据 -->
      <div class="min-w-0" style="flex: 2">
        <div
          class="wms-card"
        >
          <div
            class="flex items-center justify-between flex-wrap gap-2"
            :style="{ padding: '14px 20px', borderBottom: '1px solid var(--el-border-color-lighter)' }"
          >
            <div class="flex items-center gap-2 text-sm font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">
              <span class="inline-block w-1 h-4 rounded" :style="{ background: '#67c23a' }" />
              {{ currentType ? `${currentType.dict_name} — 数据项` : "请选择字典类型" }}
            </div>
            <div class="flex items-center gap-2">
              <el-input
                v-if="currentType"
                v-model="dataSearch"
                placeholder="搜索..."
                clearable
                size="small"
                class="w-40!"
                :prefix-icon="useRenderIcon(Search)"
              />
              <el-button v-if="currentType" type="primary" size="small" @click="openDataDialog()">新增</el-button>
            </div>
          </div>
          <div :style="{ padding: '0 20px 16px' }">
            <pure-table
              @header-dragend="(newWidth, _oldWidth, col) => onColumnResize(col.label || col.property, newWidth)"
              row-key="id"
              border
              adaptive
              :adaptiveConfig="{ offsetBottom: 60 }"
              align-whole="left"
             
              :loading="dataLoading"
              :data="filteredDataList"
              :columns="dataColumns"
              :header-cell-style="headerCellStyle"
            >
              <template #empty>
                <EmptyState v-if="!currentType" title="点击左侧字典类型查看数据" :image-size="60" />
                <EmptyState v-else title="暂无数据项" :image-size="60" />
              </template>
              <template #is_enabled="{ row }">
                <span class="inline-flex items-center gap-1.5">
                  <span class="status-dot" :class="row.is_enabled ? 'dot-success' : 'dot-unknown'" />
                  <span class="text-xs" :style="{ color: row.is_enabled ? '#67c23a' : '#909399' }">{{ row.is_enabled ? "是" : "否" }}</span>
                </span>
              </template>
              <template #operation="{ row }">
                <el-button link type="primary" size="small" @click="openDataDialog(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="handleDeleteData(row)">删除</el-button>
              </template>
            </pure-table>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 弹窗 ==================== -->
    <el-dialog v-model="typeDialogVisible" :title="typeForm.id ? '编辑字典类型' : '新增字典类型'" width="450px" destroy-on-close>
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="100px">
        <el-form-item label="字典编码" prop="dict_code">
          <el-input v-model="typeForm.dict_code" :disabled="!!typeForm.id" />
        </el-form-item>
        <el-form-item label="字典名称" prop="dict_name">
          <el-input v-model="typeForm.dict_name" />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="typeForm.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveType">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dataDialogVisible" :title="dataForm.id ? '编辑字典数据' : '新增字典数据'" width="450px" destroy-on-close>
      <el-form ref="dataFormRef" :model="dataForm" :rules="dataRules" label-width="100px">
        <el-form-item label="显示文本" prop="dict_label">
          <el-input v-model="dataForm.dict_label" />
        </el-form-item>
        <el-form-item label="取值" prop="dict_value">
          <el-input v-model="dataForm.dict_value" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="dataForm.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="dataForm.is_enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="dataForm.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dataDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveData">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-success { background: #67c23a; }
.dot-unknown { background: #c0c4cc; }

:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 10px;
  padding-bottom: 10px;
}
:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}
</style>

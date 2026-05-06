<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";

import AddFill from "~icons/ri/add-circle-line";
import Printer from "~icons/ri/printer-line";
import CheckLine from "~icons/ri/checkbox-circle-line";
import FileList from "~icons/ri/file-list-3-line";
import Search from "~icons/ri/search-line";

defineOptions({ name: "PrintConfig" });

const list = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const form = ref<any>({});
const searchKeyword = ref("");

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

// ==================== 统计 ====================
const filteredList = computed(() => {
  if (!searchKeyword.value) return list.value;
  const kw = searchKeyword.value.toLowerCase();
  return list.value.filter(
    (item: any) =>
      item.template_name?.toLowerCase().includes(kw) ||
      item.business_type?.toLowerCase().includes(kw) ||
      item.report_code?.toLowerCase().includes(kw)
  );
});

const stats = computed(() => ({
  total: filteredList.value.length,
  enabled: filteredList.value.filter((item: any) => item.is_enabled).length,
  outbound: filteredList.value.filter((item: any) => item.business_type === "outbound").length
}));

// ==================== 列定义 ====================
const columns: any[] = [
  { type: "index", label: "#", width: 56 },
  { label: "模板名称", prop: "template_name", width: 140, showOverflowTooltip: true },
  { label: "业务类型", slot: "business_type", width: 90, align: "center" },
  { label: "报表ID", prop: "report_code", width: 200, showOverflowTooltip: true },
  { label: "输出格式", prop: "output_format", width: 80, align: "center" },
  { label: "API地址", slot: "api_url", minWidth: 280, showOverflowTooltip: true },
  { label: "启用", slot: "is_enabled", width: 70, align: "center" },
  { label: "操作", slot: "operation", width: 140, align: "center" }
];

async function loadData() {
  loading.value = true;
  try { list.value = (await api.get("/print/template/list")).data; }
  finally { loading.value = false; }
}

function openDialog(row?: any) {
  if (row) {
    isEdit.value = true;
    form.value = { ...row };
  } else {
    isEdit.value = false;
    form.value = {
      template_name: "", business_type: "outbound", report_code: "",
      output_format: "PDF", api_url: "",
      jimu_token: "", is_enabled: 1
    };
  }
  dialogVisible.value = true;
}

async function handleSave() {
  saving.value = true;
  try {
    if (isEdit.value) {
      await api.put(`/print/template/${form.value.id}`, form.value);
      ElMessage.success("更新成功");
    } else {
      await api.post("/print/template", form.value);
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    loadData();
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || "保存失败");
  } finally { saving.value = false; }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定要删除模板「${row.template_name}」吗？`, "警告", { type: "warning", confirmButtonText: "确定删除" });
  await api.delete(`/print/template/${row.id}`);
  ElMessage.success("已删除");
  loadData();
}

onMounted(loadData);
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          { label: '模板总数', value: stats.total, color: 'var(--el-color-primary)', icon: Printer },
          { label: '已启用', value: stats.enabled, color: '#67c23a', icon: CheckLine },
          { label: '出库单模板', value: stats.outbound, color: 'var(--el-color-info)', icon: FileList }
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

    <!-- ==================== 操作卡片 ==================== -->
    <div
      class="wms-card mb-4"
    >
      <div :style="{ padding: '16px 20px' }">
        <div class="flex items-center gap-3 flex-wrap">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索模板名称、业务类型、报表ID..."
            clearable
            :prefix-icon="useRenderIcon(Search)"
            class="search-input"
          />
          <el-divider direction="vertical" />
          <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openDialog()">新增模板</el-button>
        </div>
      </div>
      <div
        class="flex items-center"
        :style="{ padding: '10px 20px', borderTop: '1px solid var(--el-border-color-lighter)' }"
      >
        <span class="text-xs" :style="{ color: 'var(--el-text-color-secondary)' }">
          共 <strong :style="{ color: 'var(--el-text-color-primary)' }">{{ stats.total }}</strong> 个模板
        </span>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <PureTableBar title="打印设置" :columns="columns" storage-key="PrintConfig" @refresh="loadData">
      <template v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }">
        <pure-table :key="tableRefreshKey"
          @header-dragend="(newWidth, _oldWidth, col) => onColumnResize(col.label || col.property, newWidth)"
          row-key="id"
          border
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="left"
         
          :loading="loading"
          :size="size"
          :data="filteredList"
          :columns="dynamicColumns"
          :header-cell-style="headerCellStyle"
        >
          <template #empty>
            <EmptyState title="暂无打印模板" description="点击「新增模板」创建" />
          </template>
          <template #business_type="{ row }">
            <el-tag size="small" effect="plain" :type="row.business_type === 'outbound' ? 'warning' : 'primary'">
              {{ row.business_type === "outbound" ? "出库单" : row.business_type === "inbound" ? "入库单" : row.business_type }}
            </el-tag>
          </template>
          <template #api_url="{ row }">
            <code class="url-code">{{ row.api_url }}</code>
          </template>
          <template #is_enabled="{ row }">
            <span class="inline-flex items-center gap-1.5">
              <span class="status-dot" :class="row.is_enabled ? 'dot-success' : 'dot-unknown'" />
              <span class="text-xs" :style="{ color: row.is_enabled ? '#67c23a' : '#909399' }">{{ row.is_enabled ? "是" : "否" }}</span>
            </span>
          </template>
          <template #operation="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- ==================== 编辑弹窗 ==================== -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑打印模板' : '新增打印模板'" width="550px" destroy-on-close :close-on-click-modal="false">
      <el-form :model="form" label-width="100px">
        <el-form-item label="模板名称"><el-input v-model="form.template_name" placeholder="如：出库单打印" /></el-form-item>
        <el-form-item label="业务类型">
          <el-select v-model="form.business_type" placeholder="请选择">
            <el-option label="出库单" value="outbound" />
            <el-option label="入库单" value="inbound" />
          </el-select>
        </el-form-item>
        <el-form-item label="报表ID"><el-input v-model="form.report_code" placeholder="积木报表的报表ID" /></el-form-item>
        <el-form-item label="输出格式"><el-input v-model="form.output_format" placeholder="PDF" /></el-form-item>
        <el-form-item label="API地址">
          <el-input v-model="form.api_url" placeholder="请输入积木报表 API 地址，例如 http://ip:8085/jmreport/exportReport" />
          <div class="mt-1 text-xs" :style="{ color: 'var(--el-text-color-placeholder)' }">积木报表导出接口地址，系统自动拼接 token 和 exportParams 参数</div>
        </el-form-item>
        <el-form-item label="认证Token">
          <el-input v-model="form.jimu_token" placeholder="积木报表的 X-Access-Token（可选）" />
          <div class="mt-1 text-xs" :style="{ color: 'var(--el-text-color-placeholder)' }">如果积木报表开启了认证，请填写 Token；本地版通常留空</div>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.is_enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.search-input {
  flex: 1;
  min-width: 280px;
}
.search-input :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-input-border-color, var(--el-border-color)) inset;
}

.url-code {
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--el-fill-color-light);
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 11px;
  color: var(--el-text-color-regular);
}

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
  padding-top: 12px;
  padding-bottom: 12px;
}
:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}
</style>

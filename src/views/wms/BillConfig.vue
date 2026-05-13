<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";

import Document from "~icons/ri/file-text-line";
import CheckLine from "~icons/ri/checkbox-circle-line";
import Settings from "~icons/ri/settings-3-line";

defineOptions({ name: "BillConfig" });

const list = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const form = ref<any>({});

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

// ==================== 统计 ====================
const stats = computed(() => ({
  total: list.value.length,
  enabled: list.value.filter((item: any) => item.is_enabled).length,
  dateSeq: list.value.filter((item: any) => item.serial_rule === "date_seq")
    .length
}));

// ==================== 列定义 ====================
const columns: any[] = [
  { type: "index", label: "#", width: 56 },
  {
    label: "类型编码",
    prop: "bill_type_code",
    width: 150,
    showOverflowTooltip: true
  },
  { label: "类型名称", prop: "bill_type_name", width: 130 },
  { label: "前缀", prop: "prefix", width: 100 },
  { label: "规则", slot: "serial_rule", width: 100, align: "center" },
  { label: "序号位数", prop: "serial_digits", width: 90, align: "right" },
  { label: "起始值", prop: "serial_start", width: 80, align: "right" },
  { label: "启用", slot: "is_enabled", width: 75, align: "center" },
  { label: "操作", slot: "operation", width: 80, align: "center" }
];

async function loadData() {
  loading.value = true;
  try {
    list.value = (await api.get("/sys/bill-config/list")).data?.list ?? [];
  } finally {
    loading.value = false;
  }
}

function openDialog(row: any) {
  form.value = { ...row };
  dialogVisible.value = true;
}

async function handleSave() {
  saving.value = true;
  try {
    await api.put(`/sys/bill-config/${form.value.id}`, {
      prefix: form.value.prefix,
      serial_digits: form.value.serial_digits,
      serial_start: form.value.serial_start,
      is_enabled: form.value.is_enabled
    });
    ElMessage.success("保存成功，新配置将立即生效");
    dialogVisible.value = false;
    loadData();
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          {
            label: '配置项',
            value: stats.total,
            color: 'var(--el-color-primary)',
            icon: Document
          },
          {
            label: '已启用',
            value: stats.enabled,
            color: '#67c23a',
            icon: CheckLine
          },
          {
            label: '日期序列',
            value: stats.dateSeq,
            color: 'var(--el-color-info)',
            icon: Settings
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

    <!-- ==================== 表格 ==================== -->
    <PureTableBar
      title="单据编号配置"
      :columns="columns"
      storage-key="BillConfig"
      @refresh="loadData"
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
          :header-cell-style="headerCellStyle"
          @header-dragend="
            (newWidth, _oldWidth, col) =>
              onColumnResize(col.label || col.property, newWidth)
          "
        >
          <template #empty>
            <EmptyState title="暂无单据编号配置" />
          </template>
          <template #serial_rule="{ row }">
            <el-tag
              size="small"
              effect="plain"
              :type="row.serial_rule === 'date_seq' ? 'primary' : 'info'"
            >
              {{ row.serial_rule === "date_seq" ? "日期序列" : "纯序列" }}
            </el-tag>
          </template>
          <template #is_enabled="{ row }">
            <span class="inline-flex items-center gap-1.5">
              <span
                class="status-dot"
                :class="row.is_enabled ? 'dot-success' : 'dot-unknown'"
              />
              <span
                class="text-xs"
                :style="{ color: row.is_enabled ? '#67c23a' : '#909399' }"
                >{{ row.is_enabled ? "是" : "否" }}</span
              >
            </span>
          </template>
          <template #operation="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)"
              >编辑</el-button
            >
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- ==================== 编辑弹窗 ==================== -->
    <el-dialog
      v-model="dialogVisible"
      title="编辑单据配置"
      width="400px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="类型编码"
          ><el-input :model-value="form.bill_type_code" disabled
        /></el-form-item>
        <el-form-item label="类型名称"
          ><el-input :model-value="form.bill_type_name" disabled
        /></el-form-item>
        <el-form-item label="规则">
          <el-input
            :model-value="
              form.serial_rule === 'date_seq' ? '日期序列' : '纯序列'
            "
            disabled
          />
        </el-form-item>
        <el-form-item label="前缀"
          ><el-input v-model="form.prefix"
        /></el-form-item>
        <el-form-item label="序号位数"
          ><el-input-number v-model="form.serial_digits" :min="1" :max="10"
        /></el-form-item>
        <el-form-item label="起始值"
          ><el-input-number v-model="form.serial_start" :min="1"
        /></el-form-item>
        <el-form-item label="启用">
          <el-switch
            v-model="form.is_enabled"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>
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

.dot-unknown {
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

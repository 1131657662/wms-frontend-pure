<script setup lang="ts">
import { reactive, onMounted } from "vue";
import api from "@/api/wms";
import { formatOrderStatus } from "@/utils/format";

defineOptions({ name: "DocTable" });

defineProps<{
  data: any[];
  loading?: boolean;
}>();

const docTypeText = reactive<Record<string, string>>({});
const docTypeTag = reactive<Record<string, string>>({});

async function loadDicts() {
  try {
    const docRes = await api.get("/sys/dict/data/doc_type");
    for (const d of docRes.data || []) {
      docTypeText[d.dict_value] = d.dict_label;
      docTypeTag[d.dict_value] = d.remark || "info";
    }
  } catch {
    /* 字典加载失败 */
  }
}

onMounted(loadDicts);

function formatTime(t: string) {
  if (!t) return "";
  return t.slice(0, 16).replace("T", " ");
}
</script>

<template>
  <div class="doc-table">
    <div class="doc-header">
      <span class="doc-title">最近业务单据</span>
      <el-tag size="small" round effect="plain">{{ data.length }} 条</el-tag>
    </div>
    <div class="doc-table-wrap">
      <el-table
        v-loading="loading"
        :data="data"
        size="small"
        :header-cell-class-name="() => 'doc-th'"
        max-height="400"
        style="width: 100%"
      >
        <el-table-column
          label="单据号"
          prop="order_no"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="docTypeTag[row.doc_type] || 'info'"
              size="small"
              effect="plain"
            >
              {{ docTypeText[row.doc_type] || row.doc_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="仓库"
          prop="warehouse_name"
          min-width="130"
          show-overflow-tooltip
        />
        <el-table-column
          label="关联方"
          prop="related_name"
          min-width="130"
          show-overflow-tooltip
        />
        <el-table-column label="日期" prop="date" width="110" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="formatOrderStatus(row.status).type"
              size="small"
              effect="plain"
            >
              {{ formatOrderStatus(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作人" prop="create_by" width="100" />
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            <span class="doc-time">{{ formatTime(row.create_time) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.doc-table {
  overflow: hidden;
  background: var(--dash-card-bg, var(--el-bg-color, #fff));
  border: var(--dash-border);
  border-radius: var(--dash-radius);
  box-shadow: var(--dash-shadow);
}

.doc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px var(--dash-card-pad);
  border-bottom: var(--dash-border);
}

.doc-title {
  font-size: var(--dash-title-size);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.doc-table-wrap :deep(.doc-th) {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  background: transparent !important;
}

.doc-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

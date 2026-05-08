<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import api from "@/api/wms";
import { formatCheckStatus } from "@/utils/format";
import { hasPerms } from "@/utils/auth";

defineOptions({ name: "StockCheckOrderDetail" });

const route = useRoute();
const router = useRouter();

const order = ref<any>(null);
const details = ref<any[]>([]);
const loading = ref(false);
const adjusting = ref(false);
const voiding = ref(false);
const deleting = ref(false);
const confirming = ref(false);

const totalBeforeQty = computed(() =>
  details.value.reduce((s, d) => s + (Number(d.before_qty) || 0), 0)
);
const totalBeforeWeight = computed(() =>
  details.value.reduce((s, d) => s + (Number(d.before_weight) || 0), 0)
);
const totalActualQty = computed(() =>
  details.value.reduce((s, d) => s + (Number(d.actual_qty) || 0), 0)
);
const totalActualWeight = computed(() =>
  details.value.reduce((s, d) => s + (Number(d.actual_weight) || 0), 0)
);
const totalDiffQty = computed(() =>
  details.value.reduce(
    (s, d) => s + ((d.actual_qty || 0) - (d.before_qty || 0)),
    0
  )
);
const totalDiffWeight = computed(() =>
  details.value.reduce(
    (s, d) => s + ((d.actual_weight || 0) - (d.before_weight || 0)),
    0
  )
);

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

function formatTime(t: string) {
  if (!t) return "—";
  return new Date(t)
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

function getSummary({ columns }: any) {
  const sums: any[] = [];
  columns.forEach((col: any, i: number) => {
    if (col.type === "index") sums[i] = "";
    else if (col.label === "产品编码") sums[i] = "合计";
    else if (col.label === "盘点前件数") sums[i] = totalBeforeQty.value;
    else if (col.label === "盘点前吨位")
      sums[i] = totalBeforeWeight.value.toFixed(4);
    else if (col.label === "实盘件数") sums[i] = totalActualQty.value;
    else if (col.label === "实盘吨位")
      sums[i] = totalActualWeight.value.toFixed(4);
    else if (col.label === "件数差异") sums[i] = totalDiffQty.value;
    else if (col.label === "吨位差异")
      sums[i] = totalDiffWeight.value.toFixed(4);
    else sums[i] = "";
  });
  return sums;
}

async function loadData() {
  loading.value = true;
  try {
    const res = await api.get("/stock/check_order/" + route.params.id);
    order.value = res.data.order;
    details.value = res.data.details || [];
  } finally {
    loading.value = false;
  }
}

async function handleDelete() {
  await ElMessageBox.confirm("确定删除该盘点单？", "提示", { type: "warning" });
  deleting.value = true;
  try {
    await api.delete(`/stock/check_order/${route.params.id}`);
    ElMessage.success("删除成功");
    router.push("/stock-check/list");
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "删除失败");
  } finally {
    deleting.value = false;
  }
}

async function handleConfirm() {
  await ElMessageBox.confirm("确定确认该盘点单？确认后不可编辑。", "提示", {
    type: "info"
  });
  confirming.value = true;
  try {
    await api.post(`/stock/check_order/${route.params.id}/confirm`);
    ElMessage.success("确认成功");
    loadData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "操作失败");
  } finally {
    confirming.value = false;
  }
}

async function handleVoid() {
  await ElMessageBox.confirm(
    `确定作废该盘点单？作废后不可再调整库存。`,
    "提示",
    {
      type: "warning",
      confirmButtonText: "确定作废",
      confirmButtonClass: "el-button--danger"
    }
  );
  voiding.value = true;
  try {
    await api.post(`/stock/check_order/${route.params.id}/void`);
    ElMessage.success("作废成功");
    loadData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "作废失败");
  } finally {
    voiding.value = false;
  }
}

async function handleAdjust() {
  await ElMessageBox.confirm(
    "确定按盘点单调整库存？将以实盘数更新库存并生成流水。",
    "提示",
    { type: "warning" }
  );
  adjusting.value = true;
  try {
    await api.post(`/stock/check_order/${route.params.id}/adjust`);
    ElMessage.success("库存调整成功");
    loadData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "调整失败");
  } finally {
    adjusting.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="px-5 py-4">
    <!-- 主表信息卡片 -->
    <div
      v-loading="loading"
      class="wms-card mb-4"
      :style="{ padding: '20px 24px' }"
    >
      <div class="flex-bc mb-5">
        <div
          class="flex items-center gap-2 text-sm font-semibold"
          :style="{ color: 'var(--el-text-color-primary)' }"
        >
          <span
            class="inline-block w-1 h-4 rounded"
            :style="{ background: 'var(--el-color-primary)' }"
          />盘点单详情
          <el-tag
            v-if="order"
            effect="plain"
            :type="formatCheckStatus(order.status).type"
            >{{ formatCheckStatus(order.status).label }}</el-tag
          >
        </div>
        <div class="flex items-center gap-2">
          <el-button @click="router.push('/stock-check/list')">返回</el-button>
          <el-button
            v-if="
              hasPerms('stock-check:edit') && order && order.status === 'draft'
            "
            type="danger"
            :loading="deleting"
            @click="handleDelete"
            >删除</el-button
          >
          <el-button
            v-if="
              hasPerms('stock-check:audit') && order && order.status === 'draft'
            "
            type="warning"
            :loading="confirming"
            @click="handleConfirm"
            >确认</el-button
          >
          <el-button
            v-if="
              hasPerms('stock-check:audit') &&
              order &&
              order.status === 'confirmed'
            "
            type="danger"
            :loading="voiding"
            @click="handleVoid"
            >作废</el-button
          >
          <el-button
            v-if="
              hasPerms('stock-check:audit') &&
              order &&
              order.status === 'confirmed'
            "
            type="success"
            :loading="adjusting"
            @click="handleAdjust"
            >调整库存</el-button
          >
        </div>
      </div>
      <el-descriptions v-if="order" :column="3">
        <el-descriptions-item label="盘点单号">{{
          order.check_no
        }}</el-descriptions-item>
        <el-descriptions-item label="仓库">{{
          order.warehouse_name || order.warehouse_code
        }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag
            :type="formatCheckStatus(order.status).type"
            effect="plain"
            size="small"
            >{{ formatCheckStatus(order.status).label }}</el-tag
          >
        </el-descriptions-item>
        <el-descriptions-item label="创建人">{{
          order.create_by
        }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{
          formatTime(order.create_time)
        }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{
          order.remark || "-"
        }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 盘点明细卡片 -->
    <div v-loading="loading" class="wms-card" :style="{ padding: '20px 24px' }">
      <div
        class="flex items-center gap-2 mb-4 text-sm font-semibold"
        :style="{ color: 'var(--el-text-color-primary)' }"
      >
        <span
          class="inline-block w-1 h-4 rounded"
          :style="{ background: 'var(--el-color-primary)' }"
        />盘点明细
      </div>
      <el-table
        border
        :data="details"
        stripe
        show-summary
        :summary-method="getSummary"
        :header-cell-style="headerCellStyle"
        row-key="id"
      >
        <el-table-column type="index" label="#" width="56" align="center" />
        <el-table-column prop="product_code" label="产品编码" width="130" />
        <el-table-column
          prop="product_name"
          label="产品名称"
          width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="product_model"
          label="型号"
          width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="before_qty"
          label="盘点前件数"
          width="110"
          align="right"
        />
        <el-table-column
          prop="before_weight"
          label="盘点前吨位"
          width="120"
          align="right"
        />
        <el-table-column
          prop="actual_qty"
          label="实盘件数"
          width="100"
          align="right"
        />
        <el-table-column
          prop="actual_weight"
          label="实盘吨位"
          width="120"
          align="right"
        />
        <el-table-column label="件数差异" width="90" align="right">
          <template #default="{ row }">
            <span
              :style="{
                color:
                  (row.actual_qty || 0) - (row.before_qty || 0) !== 0
                    ? '#e6a23c'
                    : ''
              }"
            >
              {{ (row.actual_qty || 0) - (row.before_qty || 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="吨位差异" width="110" align="right">
          <template #default="{ row }">
            <span
              :style="{
                color:
                  Math.abs(
                    (row.actual_weight || 0) - (row.before_weight || 0)
                  ) > 0.0001
                    ? '#e6a23c'
                    : ''
              }"
            >
              {{
                ((row.actual_weight || 0) - (row.before_weight || 0)).toFixed(4)
              }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="remark"
          label="明细备注"
          min-width="150"
          show-overflow-tooltip
        />
      </el-table>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}

:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
  color: var(--el-text-color-secondary);
}
</style>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import api from "@/api/wms";
import { responseList } from "@/utils/responseList";
import { formatOrderStatus } from "@/utils/format";
import { hasPerms } from "@/utils/auth";
import PrintDropdown from "@/components/PrintDropdown";
import * as XLSX from "xlsx";

defineOptions({ name: "OutboundOrderDetail" });

const route = useRoute();
const router = useRouter();

const billTypeMap = reactive<Record<string, string>>({});

async function loadBillTypeDict() {
  try {
    const res = await api.get("/sys/dict/data/outbound_type");
    for (const d of responseList(res.data)) {
      billTypeMap[d.dict_value] = d.dict_label;
    }
  } catch {
    /* 字典加载失败 */
  }
}

const order = ref<any>(null);
const details = ref<any[]>([]);
const loading = ref(false);
const auditing = ref(false);
const reverting = ref(false);
const deleting = ref(false);
const exporting = ref(false);

const totalQty = computed(() =>
  details.value.reduce((s, d) => s + (Number(d.outbound_qty) || 0), 0)
);
const totalWeight = computed(() =>
  details.value.reduce((s, d) => s + (Number(d.outbound_weight) || 0), 0)
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

function getDetailSummary({ columns }: any) {
  const sums: any[] = [];
  columns.forEach((col: any, i: number) => {
    if (col.type === "index") sums[i] = "";
    else if (col.label === "产品编码") sums[i] = "合计";
    else if (col.label === "出库件数") sums[i] = totalQty.value;
    else if (col.label === "出库吨位") sums[i] = totalWeight.value.toFixed(4);
    else sums[i] = "";
  });
  return sums;
}

async function loadData() {
  loading.value = true;
  try {
    const res = await api.get("/outbound/order/" + route.params.id);
    order.value = res.data.order;
    details.value = res.data.details || [];
  } finally {
    loading.value = false;
  }
}

async function handleExport() {
  exporting.value = true;
  try {
    const headers = [
      "单据编号",
      "单据类型",
      "仓库编码",
      "仓库名称",
      "客户编码",
      "客户名称",
      "客户地址",
      "联系人",
      "电话",
      "出库日期",
      "车号",
      "柜号",
      "备注",
      "审核人",
      "审核时间",
      "创建人",
      "创建时间",
      "产品编码",
      "产品名称",
      "型号",
      "合同号",
      "出库件数",
      "出库吨位",
      "明细备注"
    ];
    const rows = details.value.map((d: any) => [
      order.value.order_no,
      order.value.bill_type_code || "出库单",
      order.value.warehouse_code,
      order.value.warehouse_name,
      order.value.customer_code,
      order.value.customer_name,
      order.value.customer_address || "",
      order.value.contact_person || "",
      order.value.contact_phone || "",
      order.value.outbound_date,
      order.value.vehicle_no,
      order.value.container_no || "",
      order.value.remark || "",
      order.value.audit_by || "",
      formatTime(order.value.audit_time),
      order.value.create_by || "",
      formatTime(order.value.create_time),
      d.product_code,
      d.product_name,
      d.product_model,
      d.contract_no || "",
      d.outbound_qty,
      d.outbound_weight,
      d.detail_remark || ""
    ]);
    const sheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = headers.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "出库单明细");
    XLSX.writeFile(wb, `出库单_${order.value.order_no}.xlsx`);
  } catch {
    ElMessage.error("导出失败");
  } finally {
    exporting.value = false;
  }
}

async function handleDelete() {
  await ElMessageBox.confirm("确定删除该出库单？", "提示", { type: "warning" });
  deleting.value = true;
  try {
    await api.delete(`/outbound/order/${route.params.id}`);
    ElMessage.success("删除成功");
    router.push("/outbound/list");
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "删除失败");
  } finally {
    deleting.value = false;
  }
}

async function handleAudit() {
  await ElMessageBox.confirm(
    "确定审核通过该出库单？审核后将扣减库存。",
    "审核确认",
    { type: "info" }
  );
  auditing.value = true;
  try {
    await api.post(`/outbound/order/${route.params.id}/audit`);
    ElMessage.success("审核成功");
    loadData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "审核失败");
  } finally {
    auditing.value = false;
  }
}

async function handleRevert() {
  await ElMessageBox.confirm("确定撤销审核？将回退库存变更。", "撤销审核", {
    type: "warning"
  });
  reverting.value = true;
  try {
    await api.post(`/outbound/order/${route.params.id}/revert`);
    ElMessage.success("撤销成功");
    loadData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "撤销失败");
  } finally {
    reverting.value = false;
  }
}

onMounted(() => {
  loadData();
  loadBillTypeDict();
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
          />出库单详情
          <el-tag
            v-if="order"
            effect="plain"
            :type="formatOrderStatus(order.order_status).type"
            >{{ formatOrderStatus(order.order_status).label }}</el-tag
          >
        </div>
        <div class="flex items-center gap-2">
          <el-button @click="router.back()">返回</el-button>
          <PrintDropdown
            v-if="order"
            page-code="outbound_order"
            :business-id="order.order_no"
          />
          <el-button type="success" :loading="exporting" @click="handleExport"
            >导出 Excel</el-button
          >
          <el-button
            v-if="
              hasPerms('outbound:edit') &&
              order &&
              (order.order_status === 'draft' ||
                order.order_status === 'submit')
            "
            type="danger"
            :loading="deleting"
            @click="handleDelete"
            >删除</el-button
          >
          <el-button
            v-if="
              hasPerms('outbound:audit') &&
              order &&
              order.order_status === 'submit'
            "
            type="success"
            :loading="auditing"
            @click="handleAudit"
            >审核通过</el-button
          >
          <el-button
            v-if="
              hasPerms('outbound:audit') &&
              order &&
              order.order_status === 'audited'
            "
            type="warning"
            :loading="reverting"
            @click="handleRevert"
            >撤销审核</el-button
          >
        </div>
      </div>
      <el-descriptions v-if="order" :column="3">
        <el-descriptions-item label="单据编号">{{
          order.order_no
        }}</el-descriptions-item>
        <el-descriptions-item label="单据类型">{{
          billTypeMap[order.bill_type_code] || order.bill_type_code || "—"
        }}</el-descriptions-item>
        <el-descriptions-item label="仓库">{{
          order.warehouse_name || order.warehouse_code
        }}</el-descriptions-item>
        <el-descriptions-item label="出库日期">{{
          order.outbound_date
        }}</el-descriptions-item>
        <el-descriptions-item label="车号">{{
          order.vehicle_no
        }}</el-descriptions-item>
        <el-descriptions-item label="柜号">{{
          order.container_no || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{
          order.create_by
        }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{
          formatTime(order.create_time)
        }}</el-descriptions-item>
        <el-descriptions-item label="审核人">{{
          order.audit_by || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{
          formatTime(order.audit_time)
        }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{
          order.remark || "-"
        }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 客户信息卡片 -->
    <div
      v-loading="loading"
      class="wms-card mb-4"
      :style="{ padding: '20px 24px' }"
    >
      <div
        class="flex items-center gap-2 mb-5 text-sm font-semibold"
        :style="{ color: 'var(--el-text-color-primary)' }"
      >
        <span
          class="inline-block w-1 h-4 rounded"
          :style="{ background: 'var(--el-color-primary)' }"
        />客户信息
      </div>
      <el-descriptions v-if="order" :column="4">
        <el-descriptions-item label="客户名称">{{
          order.customer_name || order.customer_code
        }}</el-descriptions-item>
        <el-descriptions-item label="客户地址">{{
          order.customer_address || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{
          order.contact_person || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{
          order.contact_phone || "-"
        }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 明细信息卡片 -->
    <div v-loading="loading" class="wms-card" :style="{ padding: '20px 24px' }">
      <div
        class="flex items-center gap-2 mb-4 text-sm font-semibold"
        :style="{ color: 'var(--el-text-color-primary)' }"
      >
        <span
          class="inline-block w-1 h-4 rounded"
          :style="{ background: 'var(--el-color-primary)' }"
        />明细信息
      </div>
      <el-table
        border
        :data="details"
        stripe
        show-summary
        :summary-method="getDetailSummary"
        :header-cell-style="headerCellStyle"
        row-key="id"
      >
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column prop="product_code" label="产品编码" width="130" />
        <el-table-column
          prop="product_name"
          label="产品名称"
          width="130"
          show-overflow-tooltip
        />
        <el-table-column
          prop="product_model"
          label="型号"
          width="130"
          show-overflow-tooltip
        />
        <el-table-column prop="contract_no" label="合同号" width="120" />
        <el-table-column
          prop="outbound_qty"
          label="出库件数"
          width="100"
          align="right"
        />
        <el-table-column
          prop="outbound_weight"
          label="出库吨位"
          width="110"
          align="right"
        />
        <el-table-column
          prop="detail_remark"
          label="备注"
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

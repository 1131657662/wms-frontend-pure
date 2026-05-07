<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  formatDate,
  formatOrderStatus,
  ORDER_STATUS_MAP
} from "@/utils/format";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import * as XLSX from "xlsx";

import AddFill from "~icons/ri/add-circle-line";
import View from "~icons/ep/view";
import Edit from "~icons/ep/edit-pen";
import Download from "~icons/ep/download";
import Filter from "~icons/ep/filter";
import ArrowDown from "~icons/ep/arrow-down";
import CircleCheck from "~icons/ep/circle-check";
import Clock from "~icons/ep/clock";
import PrintDropdown from "@/components/PrintDropdown";

defineOptions({ name: "InboundOrderList" });
const router = useRouter();

const tableRef = ref();
const dataList = ref([]);
const loading = ref(false);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-InboundOrderList")) || 20,
  currentPage: 1,
  background: true,
  pageSizes: [10, 20, 50, 100, 200, 500, 1000]
});
const warehouses = ref<any[]>([]);
const selectedRows = ref<any[]>([]);
const exporting = ref(false);
const batchActing = ref(false);

const statusFilterOptions = computed(() =>
  Object.entries(ORDER_STATUS_MAP).map(([value, label]) => ({ label, value }))
);

const billTypeOptions = ref<{ label: string; value: string }[]>([]);
const billTypeMap = reactive<Record<string, string>>({});

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

const columns: any[] = [
  { type: "selection", label: "选择", width: 40 },
  {
    type: "index",
    label: "#",
    width: 56,
    index: (i: number) =>
      (pagination.currentPage - 1) * pagination.pageSize + i + 1
  },
  {
    label: "单据编号",
    prop: "order_no",
    width: 170,
    showOverflowTooltip: true
  },
  {
    label: "单据类型",
    prop: "bill_type_code",
    slot: "bill_type_code",
    width: 110,
    showOverflowTooltip: true
  },
  { label: "入库日期", prop: "inbound_date", slot: "inbound_date", width: 110 },
  { label: "车号", prop: "vehicle_no", width: 120, showOverflowTooltip: true },
  {
    label: "柜号",
    prop: "container_no",
    width: 100,
    showOverflowTooltip: true
  },
  {
    label: "仓库",
    prop: "warehouse_name",
    width: 120,
    showOverflowTooltip: true
  },
  {
    label: "供应商",
    prop: "supplier_name",
    width: 130,
    showOverflowTooltip: true
  },
  {
    label: "来货单号",
    prop: "delivery_no",
    width: 120,
    showOverflowTooltip: true
  },
  {
    label: "状态",
    prop: "order_status",
    slot: "order_status",
    width: 90,
    align: "center"
  },
  { label: "件数合计", prop: "totalQty", width: 100, align: "right" },
  {
    label: "吨位合计",
    prop: "totalWeight",
    slot: "totalWeight",
    width: 110,
    align: "right"
  },
  { label: "备注", prop: "remark", minWidth: 180, showOverflowTooltip: true },
  { label: "审核人", prop: "audit_by", width: 100 },
  { label: "审核时间", prop: "audit_time", slot: "audit_time", width: 170 },
  { label: "创建人", prop: "create_by", width: 100 },
  { label: "创建时间", prop: "create_time", slot: "create_time", width: 170 },
  {
    label: "操作",
    slot: "operation",
    width: 140,
    fixed: "right",
    align: "center"
  }
];

async function fetchData() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    };
    if (filters.order_no) params.order_no = filters.order_no;
    if (filters.bill_type_code) params.bill_type_code = filters.bill_type_code;
    if (filters.dateRange) {
      params.inbound_date_start = filters.dateRange[0];
      params.inbound_date_end = filters.dateRange[1];
    }
    if (filters.vehicle_no) params.vehicle_no = filters.vehicle_no;
    if (filters.container_no) params.container_no = filters.container_no;
    if (filters.delivery_no) params.delivery_no = filters.delivery_no;
    if (filters.warehouse_code) params.warehouse_code = filters.warehouse_code;
    if (filters.supplier_code) params.supplier_code = filters.supplier_code;
    if (filters.order_status) params.order_status = filters.order_status;
    if (filters.audit_by) params.audit_by = filters.audit_by;
    if (filters.create_by) params.create_by = filters.create_by;
    if (filters.remark) params.remark = filters.remark;
    if (filters.totalQty_min != null)
      params.totalQty_min = filters.totalQty_min;
    if (filters.totalQty_max != null)
      params.totalQty_max = filters.totalQty_max;
    if (filters.totalWeight_min != null)
      params.totalWeight_min = filters.totalWeight_min;
    if (filters.totalWeight_max != null)
      params.totalWeight_max = filters.totalWeight_max;
    const res = await api.get("/inbound/order/list", { params });
    dataList.value = res.data.list;
    pagination.total = res.data.total;
    selectedRows.value = [];
  } finally {
    loading.value = false;
  }
}

const handleSizeChange = (v: number) => {
  localStorage.setItem("page-size-InboundOrderList", String(v));
  pagination.pageSize = v;
  fetchData();
};
const handleCurrentChange = (v: number) => {
  pagination.currentPage = v;
  fetchData();
};
const onSelectionChange = (rows: any[]) => {
  selectedRows.value = rows;
};

function isRowSelected(row: any) {
  return selectedRows.value.some((r: any) => r.id === row.id);
}

function getRowClassName({ row }: { row: any }) {
  return isRowSelected(row) ? "row-selected" : "";
}

function handleRowClick(row: any, _column: any, event: Event) {
  const target = event.target as HTMLElement;
  if (target.closest("button, a, .el-button, .el-dropdown, .el-checkbox"))
    return;
  tableRef.value?.getTableRef()?.toggleRowSelection(row);
}

async function loadWarehouses() {
  try {
    const res = await api.get("/warehouse/list", {
      params: { pageSize: 1000, enabled: 1 }
    });
    warehouses.value = res.data.list || [];
  } catch {
    /* empty */
  }
}

// ── 筛选抽屉 ──
const drawerVisible = ref(false);
const supplierOptions = ref<any[]>([]);

const filters = reactive({
  order_no: "",
  bill_type_code: "",
  dateRange: null as any,
  vehicle_no: "",
  container_no: "",
  delivery_no: "",
  remark: "",
  warehouse_code: "",
  supplier_code: "",
  totalQty_min: null as number | null,
  totalQty_max: null as number | null,
  totalWeight_min: null as number | null,
  totalWeight_max: null as number | null,
  order_status: "",
  audit_by: "",
  create_by: ""
});

const activeFilterCount = computed(() => {
  let n = 0;
  for (const key of Object.keys(filters)) {
    if (key === "dateRange") {
      if (filters.dateRange) n++;
    } else if (key.startsWith("totalQty") || key.startsWith("totalWeight")) {
      if ((filters as any)[key] != null) n++;
    } else {
      if ((filters as any)[key]) n++;
    }
  }
  return n;
});

const statsCards = computed(() => [
  {
    label: "草稿",
    value: dataList.value.filter((r: any) => r.order_status === "draft").length,
    color: "var(--el-color-info)",
    icon: Edit
  },
  {
    label: "已提交",
    value: dataList.value.filter((r: any) => r.order_status === "submit")
      .length,
    color: "var(--el-color-warning)",
    icon: Clock
  },
  {
    label: "已审核",
    value: dataList.value.filter((r: any) => r.order_status === "audited")
      .length,
    color: "var(--el-color-success)",
    icon: CircleCheck
  }
]);

async function loadSuppliers() {
  try {
    const res = await api.get("/supplier/list", {
      params: { page: 1, pageSize: 100, enabled: 1 }
    });
    supplierOptions.value = res.data.list || [];
  } catch {
    /* empty */
  }
}

function openDrawer() {
  drawerVisible.value = true;
}
function applyFilters() {
  pagination.currentPage = 1;
  drawerVisible.value = false;
  fetchData();
}

function resetFilters() {
  Object.assign(filters, {
    order_no: "",
    bill_type_code: "",
    dateRange: null,
    vehicle_no: "",
    container_no: "",
    delivery_no: "",
    remark: "",
    warehouse_code: "",
    supplier_code: "",
    totalQty_min: null,
    totalQty_max: null,
    totalWeight_min: null,
    totalWeight_max: null,
    order_status: "",
    audit_by: "",
    create_by: ""
  });
  pagination.currentPage = 1;
  drawerVisible.value = false;
  fetchData();
}

// ── 批量确认通用校验 ──
async function confirmBatchOp(
  rows: any[],
  requiredStatus: string,
  actionName: string
) {
  const can = rows.filter((r: any) => r.order_status === requiredStatus);
  const cannot = rows.filter((r: any) => r.order_status !== requiredStatus);
  if (can.length === 0) {
    ElMessage.warning(
      `选中的单据没有「${formatOrderStatus(requiredStatus).label}」状态的，无法${actionName}`
    );
    return null;
  }
  if (cannot.length > 0) {
    const cannotList = cannot
      .map(
        (r: any) => `${r.order_no}(${formatOrderStatus(r.order_status).label})`
      )
      .join("、");
    try {
      await ElMessageBox.confirm(
        `以下 ${cannot.length} 条不满足${actionName}条件（需「${formatOrderStatus(requiredStatus).label}」）：\n${cannotList}\n\n可${actionName}的有 ${can.length} 条，是否仅${actionName}这些？`,
        "提示",
        {
          type: "warning",
          confirmButtonText: `仅${actionName}可操作的`,
          cancelButtonText: "取消"
        }
      );
    } catch {
      return null;
    }
  } else {
    try {
      await ElMessageBox.confirm(
        `确定批量${actionName}选中的 ${can.length} 条单据？`,
        "批量操作",
        { type: "info" }
      );
    } catch {
      return null;
    }
  }
  return can;
}

async function handleBatchAudit() {
  if (selectedRows.value.length === 0) return;
  batchActing.value = true;
  try {
    const canOperate = await confirmBatchOp(
      selectedRows.value,
      "submit",
      "审核"
    );
    if (!canOperate) return;
    const items = canOperate.map((r: any) => ({
      id: r.id,
      lock_version: r.lock_version
    }));
    try {
      const res = await api.post("/inbound/order/batch-audit", { items });
      const { success, failed } = res.data;
      let msg = `成功 ${success.length} 条`;
      if (failed.length > 0)
        msg += `，失败 ${failed.length} 条：${failed.map((f: any) => f.reason).join("；")}`;
      ElMessage({
        type: failed.length > 0 ? "warning" : "success",
        message: msg,
        duration: 5000
      });
      fetchData();
    } catch (e: any) {
      ElMessage.error(e.response?.data?.message || "批量审核失败");
    }
  } finally {
    batchActing.value = false;
  }
}

async function handleBatchSubmit() {
  if (selectedRows.value.length === 0) return;
  batchActing.value = true;
  try {
    const canOperate = await confirmBatchOp(
      selectedRows.value,
      "draft",
      "提交"
    );
    if (!canOperate) return;
    let successCount = 0;
    const failedList: string[] = [];
    for (const row of canOperate) {
      try {
        await api.post(`/inbound/order/${row.id}/submit`);
        successCount++;
      } catch (err: any) {
        failedList.push(
          `${row.order_no}: ${err.response?.data?.message || "提交失败"}`
        );
      }
    }
    let msg = `成功 ${successCount} 条`;
    if (failedList.length > 0)
      msg += `，失败 ${failedList.length} 条：${failedList.join("；")}`;
    ElMessage({
      type: failedList.length > 0 ? "warning" : "success",
      message: msg,
      duration: 5000
    });
    fetchData();
  } finally {
    batchActing.value = false;
  }
}

const exportFields = [
  { header: "单据编号", key: "order_no" },
  { header: "单据类型", key: "bill_type_code" },
  { header: "仓库编码", key: "warehouse_code" },
  { header: "仓库名称", key: "warehouse_name" },
  { header: "供应商编码", key: "supplier_code" },
  { header: "供应商名称", key: "supplier_name" },
  { header: "入库日期", key: "inbound_date" },
  { header: "车号", key: "vehicle_no" },
  { header: "柜号", key: "container_no" },
  { header: "来货单号", key: "delivery_no" },
  {
    header: "状态",
    key: "order_status",
    map: (v: string) => formatOrderStatus(v).label
  },
  { header: "件数合计", key: "totalQty" },
  { header: "吨位合计", key: "totalWeight" },
  { header: "备注", key: "remark" },
  { header: "审核人", key: "audit_by" },
  { header: "审核时间", key: "audit_time" },
  { header: "创建人", key: "create_by" },
  { header: "创建时间", key: "create_time" }
];

function rowsToSheetData(rows: any[]) {
  return rows.map((row, i) => {
    const obj: Record<string, any> = { 序号: i + 1 };
    exportFields.forEach(f => {
      const val = row[f.key];
      obj[f.header] = f.map ? f.map(val) : (val ?? "");
    });
    return obj;
  });
}

function exportToExcel(rows: any[], filename: string) {
  const sheetData = rowsToSheetData(rows);
  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "入库单");
  XLSX.writeFile(wb, filename);
}

async function fetchAllData(params: Record<string, any>) {
  const res = await api.get("/inbound/order/list", {
    params: { ...params, page: 1, pageSize: 100000 }
  });
  return res.data.list || [];
}

async function handleExportCommand(command: string) {
  exporting.value = true;
  try {
    if (command === "selected") {
      if (selectedRows.value.length === 0) {
        ElMessage.warning("请先勾选要导出的订单");
        return;
      }
      exportToExcel(selectedRows.value, "入库单_选中.xlsx");
      ElMessage.success("导出成功");
    } else {
      if (activeFilterCount.value === 0) {
        try {
          await ElMessageBox.confirm(
            "当前未设置任何筛选条件，将导出数据库中所有入库单。确定要继续吗？",
            "导出确认",
            { type: "warning", confirmButtonText: "确定导出" }
          );
        } catch {
          return;
        }
      }
      const params: any = {};
      if (filters.order_no) params.order_no = filters.order_no;
      if (filters.bill_type_code)
        params.bill_type_code = filters.bill_type_code;
      if (filters.dateRange) {
        params.inbound_date_start = filters.dateRange[0];
        params.inbound_date_end = filters.dateRange[1];
      }
      if (filters.warehouse_code)
        params.warehouse_code = filters.warehouse_code;
      if (filters.order_status) params.order_status = filters.order_status;
      if (filters.vehicle_no) params.vehicle_no = filters.vehicle_no;
      if (filters.container_no) params.container_no = filters.container_no;
      if (filters.supplier_code) params.supplier_code = filters.supplier_code;
      if (filters.delivery_no) params.delivery_no = filters.delivery_no;
      const rows = await fetchAllData(params);
      if (rows.length === 0) {
        ElMessage.warning("没有符合条件的记录");
        return;
      }
      exportToExcel(rows, "入库单.xlsx");
      ElMessage.success(`导出成功，共 ${rows.length} 条`);
    }
  } finally {
    exporting.value = false;
  }
}

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

async function loadDict() {
  try {
    const res = await api.get("/sys/dict/data/inbound_type");
    const list = res.data || [];
    billTypeOptions.value = list.map((d: any) => ({
      label: d.dict_label,
      value: d.dict_value
    }));
    for (const d of list) {
      billTypeMap[d.dict_value] = d.dict_label;
    }
  } catch {
    /* 字典加载失败使用空数组 */
  }
}

onMounted(() => {
  loadDict();
  fetchData();
  loadWarehouses();
  loadSuppliers();
});
</script>

<template>
  <div class="px-5 py-4">
    <!-- 统计卡片 -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in statsCards"
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

    <!-- 顶部操作栏 -->
    <div class="wms-card mb-4" :style="{ padding: '20px 24px' }">
      <div
        class="flex items-center gap-2 mb-4 text-sm font-semibold"
        :style="{ color: 'var(--el-text-color-primary)' }"
      >
        <span
          class="inline-block w-1 h-4 rounded"
          :style="{ background: 'var(--el-color-primary)' }"
        />操作
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <el-button
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="router.push('/inbound/form')"
          >新增入库单</el-button
        >
        <el-button
          type="success"
          plain
          :disabled="selectedRows.length === 0"
          :loading="batchActing"
          @click="handleBatchAudit"
          >批量审核 {{ selectedRows.length }}</el-button
        >
        <el-button
          type="warning"
          plain
          :disabled="selectedRows.length === 0"
          :loading="batchActing"
          @click="handleBatchSubmit"
          >一键提交 {{ selectedRows.length }}</el-button
        >
        <el-dropdown trigger="click" @command="handleExportCommand">
          <el-button plain :icon="useRenderIcon(Download)" :loading="exporting"
            >导出 Excel<el-icon class="ml-1"
              ><component :is="useRenderIcon(ArrowDown)" /></el-icon
          ></el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="selected"
                >导出选中订单</el-dropdown-item
              >
              <el-dropdown-item command="all">导出全部结果</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <PrintDropdown
          page-code="inbound_order"
          :business-id="selectedRows[0]?.order_no || ''"
          :disabled="selectedRows.length !== 1"
        />
        <el-button plain :icon="useRenderIcon(Filter)" @click="openDrawer">
          筛选<template v-if="activeFilterCount"
            >&nbsp;{{ activeFilterCount }}</template
          >
        </el-button>
      </div>
    </div>

    <!-- 表格区域 -->
    <PureTableBar
      title="入库单管理"
      :columns="columns"
      storage-key="InboundOrderList"
      @refresh="fetchData"
    >
      <template
        v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }"
      >
        <pure-table
          :key="tableRefreshKey"
          ref="tableRef"
          border
          row-key="id"
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="left"
          :loading="loading"
          :size="size"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="pagination"
          :header-cell-style="headerCellStyle"
          :row-class-name="getRowClassName"
          @header-dragend="
            (newWidth, _oldWidth, col) =>
              onColumnResize(col.label || col.property, newWidth)
          "
          @row-click="handleRowClick"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
          @selection-change="onSelectionChange"
        >
          <template #empty>
            <EmptyState
              title="暂无入库单数据"
              description="调整筛选条件或点击新增"
            />
          </template>
          <template #order_status="{ row }">
            <el-tag
              :type="formatOrderStatus(row.order_status).type"
              effect="plain"
              size="small"
              >{{ formatOrderStatus(row.order_status).label }}</el-tag
            >
          </template>
          <template #totalWeight="{ row }">{{
            Number(row.totalWeight || 0).toFixed(4)
          }}</template>
          <template #bill_type_code="{ row }">{{
            billTypeMap[row.bill_type_code] || row.bill_type_code || "—"
          }}</template>
          <template #inbound_date="{ row }">{{
            formatDate(row.inbound_date)
          }}</template>
          <template #audit_time="{ row }">{{
            formatTime(row.audit_time)
          }}</template>
          <template #create_time="{ row }">{{
            formatTime(row.create_time)
          }}</template>
          <template #operation="{ row }">
            <div class="flex justify-start gap-1" style="min-width: 120px">
              <el-button
                link
                type="primary"
                size="small"
                :icon="useRenderIcon(View)"
                @click="router.push(`/inbound/detail/${row.id}`)"
                >查看</el-button
              >
              <el-button
                v-if="
                  row.order_status === 'draft' || row.order_status === 'submit'
                "
                link
                type="primary"
                size="small"
                :icon="useRenderIcon(Edit)"
                @click="router.push(`/inbound/form/${row.id}`)"
                >编辑</el-button
              >
            </div>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 筛选抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="筛选条件"
      size="400px"
      direction="rtl"
    >
      <!-- 基础信息 -->
      <div class="drawer-section">
        <div class="drawer-section__title">基础信息</div>
        <div class="drawer-field">
          <label>单据编号</label>
          <el-input
            v-model="filters.order_no"
            placeholder="模糊搜索"
            clearable
          />
        </div>
        <div class="drawer-field">
          <label>单据类型</label>
          <el-select
            v-model="filters.bill_type_code"
            placeholder="全部"
            clearable
          >
            <el-option
              v-for="t in billTypeOptions"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </div>
        <div class="drawer-field">
          <label>入库日期</label>
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            class="w-full!"
          />
        </div>
        <div class="drawer-field">
          <label>车号</label>
          <el-input
            v-model="filters.vehicle_no"
            placeholder="模糊搜索"
            clearable
          />
        </div>
        <div class="drawer-field">
          <label>柜号</label>
          <el-input
            v-model="filters.container_no"
            placeholder="模糊搜索"
            clearable
          />
        </div>
        <div class="drawer-field">
          <label>来货单号</label>
          <el-input
            v-model="filters.delivery_no"
            placeholder="模糊搜索"
            clearable
          />
        </div>
        <div class="drawer-field">
          <label>备注</label>
          <el-input v-model="filters.remark" placeholder="模糊搜索" clearable />
        </div>
      </div>

      <!-- 关联表信息 -->
      <div class="drawer-section">
        <div class="drawer-section__title">关联表信息</div>
        <div class="drawer-field">
          <label>仓库</label>
          <el-select
            v-model="filters.warehouse_code"
            placeholder="全部"
            clearable
            filterable
          >
            <el-option
              v-for="w in warehouses"
              :key="w.warehouse_code"
              :label="w.warehouse_name"
              :value="w.warehouse_code"
            />
          </el-select>
        </div>
        <div class="drawer-field">
          <label>供应商</label>
          <el-select
            v-model="filters.supplier_code"
            placeholder="全部"
            clearable
            filterable
          >
            <el-option
              v-for="s in supplierOptions"
              :key="s.supplier_code"
              :label="`${s.supplier_code} ${s.supplier_name}`"
              :value="s.supplier_code"
            />
          </el-select>
        </div>
      </div>

      <!-- 数量金额 -->
      <div class="drawer-section">
        <div class="drawer-section__title">数量金额</div>
        <div class="drawer-field">
          <label>件数合计</label>
          <div class="flex gap-2">
            <el-input-number
              v-model="filters.totalQty_min"
              :min="0"
              placeholder="最小值"
              controls-position="right"
              class="w-full!"
            />
            <span class="text-gray-400 self-center">—</span>
            <el-input-number
              v-model="filters.totalQty_max"
              :min="0"
              placeholder="最大值"
              controls-position="right"
              class="w-full!"
            />
          </div>
        </div>
        <div class="drawer-field">
          <label>吨位合计</label>
          <div class="flex gap-2">
            <el-input-number
              v-model="filters.totalWeight_min"
              :min="0"
              :precision="4"
              :step="0.0001"
              placeholder="最小值"
              controls-position="right"
              class="w-full!"
            />
            <span class="text-gray-400 self-center">—</span>
            <el-input-number
              v-model="filters.totalWeight_max"
              :min="0"
              :precision="4"
              :step="0.0001"
              placeholder="最大值"
              controls-position="right"
              class="w-full!"
            />
          </div>
        </div>
      </div>

      <!-- 状态信息 -->
      <div class="drawer-section">
        <div class="drawer-section__title">状态信息</div>
        <div class="drawer-field">
          <label>审核状态</label>
          <el-select
            v-model="filters.order_status"
            placeholder="全部"
            clearable
          >
            <el-option
              v-for="s in statusFilterOptions"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </div>
        <div class="drawer-field">
          <label>审核人</label>
          <el-input
            v-model="filters.audit_by"
            placeholder="模糊搜索"
            clearable
          />
        </div>
        <div class="drawer-field">
          <label>创建人</label>
          <el-input
            v-model="filters.create_by"
            placeholder="模糊搜索"
            clearable
          />
        </div>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="primary" :loading="loading" @click="applyFilters"
            >查询</el-button
          >
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
/* ── 表格行高 48px ── */
:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}

:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}

:deep(.el-table__body-wrapper .row-selected > td) {
  background-color: var(--el-color-warning-light-8) !important;
}

:deep(.el-table__body-wrapper .row-selected:hover > td) {
  background-color: var(--el-color-warning-light-7) !important;
}

/* ── 抽屉字段分组 ── */
.drawer-section {
  margin-bottom: 20px;
}

.drawer-section + .drawer-section {
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.drawer-section__title {
  padding-left: 4px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.drawer-field {
  margin-bottom: 14px;
}

.drawer-field > label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.drawer-field > :deep(.el-select),
.drawer-field > :deep(.el-date-picker) {
  width: 100%;
}

.drawer-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>

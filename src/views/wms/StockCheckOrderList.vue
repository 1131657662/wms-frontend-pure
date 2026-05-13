<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";

import AddFill from "~icons/ri/add-circle-line";
import Search from "~icons/ri/search-line";
import Download from "~icons/ep/download";
import Filter from "~icons/ep/filter";
import Checked from "~icons/ep/checked";
import Document from "~icons/ri/file-text-line";
import PrintDropdown from "@/components/PrintDropdown";
import { formatCheckStatus, CHECK_STATUS_MAP } from "@/utils/format";
import { hasPerms } from "@/utils/auth";

defineOptions({ name: "StockCheckOrderList" });
const router = useRouter();

const searchForm = reactive({ keyword: "" });
const dataList = ref([]);
const loading = ref(false);
const exporting = ref(false);
const deleting = ref(0);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-StockCheckOrderList")) || 20,
  currentPage: 1,
  background: true,
  pageSizes: [10, 20, 50, 100, 500, 1000]
});
const warehouses = ref<any[]>([]);
const selectedRows = ref<any[]>([]);

const statusFilterOptions = computed(() =>
  Object.entries(CHECK_STATUS_MAP).map(([value, label]) => ({ label, value }))
);

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

// ==================== 统计 ====================
const stats = computed(() => ({
  total: pagination.total,
  draft: dataList.value.filter((o: any) => o.status === "draft").length,
  confirmed: dataList.value.filter(
    (o: any) => o.status === "confirmed" || o.status === "adjusted"
  ).length
}));

// ==================== 列定义 ====================
const columns: any[] = [
  { type: "selection", label: "选择", width: 40 },
  {
    type: "index",
    label: "#",
    width: 56,
    index: (i: number) =>
      (pagination.currentPage - 1) * pagination.pageSize + i + 1
  },
  { label: "盘点单号", prop: "check_no", width: 180 },
  { label: "仓库", prop: "warehouse_name", width: 150 },
  { label: "状态", slot: "status", width: 90, align: "center" },
  { label: "备注", prop: "remark", minWidth: 200, showOverflowTooltip: true },
  { label: "创建人", prop: "create_by", width: 100 },
  { label: "创建时间", slot: "create_time", width: 170 },
  {
    label: "操作",
    slot: "operation",
    width: 290,
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
    if (searchForm.keyword) params.keyword = searchForm.keyword;
    if (filters.warehouse_code) params.warehouse_code = filters.warehouse_code;
    if (filters.status) params.status = filters.status;
    const res = await api.get("/stock/check_order/list", { params });
    dataList.value = res.data.list;
    pagination.total = res.data.total;
    selectedRows.value = [];
  } finally {
    loading.value = false;
  }
}

const onSearch = () => {
  pagination.currentPage = 1;
  fetchData();
};
const onSelectionChange = (rows: any[]) => {
  selectedRows.value = rows;
};
const handleSizeChange = (v: number) => {
  localStorage.setItem("page-size-StockCheckOrderList", String(v));
  pagination.pageSize = v;
  fetchData();
};
const handleCurrentChange = (v: number) => {
  pagination.currentPage = v;
  fetchData();
};

async function loadWarehouses() {
  try {
    warehouses.value =
      (
        await api.get("/warehouse/list", {
          params: { pageSize: 500, enabled: 1 }
        })
      ).data.list || [];
  } catch {
    /* empty */
  }
}

// ==================== 筛选抽屉 ====================
const drawerVisible = ref(false);
const filters = reactive({ warehouse_code: "", status: "" });
const activeFilterCount = computed(
  () => (filters.warehouse_code ? 1 : 0) + (filters.status ? 1 : 0)
);

function applyFilters() {
  pagination.currentPage = 1;
  drawerVisible.value = false;
  fetchData();
}
function resetFilters() {
  Object.assign(filters, { warehouse_code: "", status: "" });
  searchForm.keyword = "";
  pagination.currentPage = 1;
  drawerVisible.value = false;
  fetchData();
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除盘点单「${row.check_no}」？`, "提示", {
    type: "warning"
  });
  deleting.value = row.id;
  try {
    await api.delete(`/stock/check_order/${row.id}`);
    ElMessage.success("删除成功");
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "删除失败");
  } finally {
    deleting.value = 0;
  }
}

async function handleConfirm(row: any) {
  await ElMessageBox.confirm(
    `确定确认盘点单「${row.check_no}」？确认后不可编辑。`,
    "提示",
    { type: "info" }
  );
  await api.post(`/stock/check_order/${row.id}/confirm`);
  ElMessage.success("确认成功");
  fetchData();
}

async function handleVoid(row: any) {
  await ElMessageBox.confirm(
    `确定作废盘点单「${row.check_no}」？作废后不可再调整库存。`,
    "提示",
    {
      type: "warning",
      confirmButtonText: "确定作废",
      confirmButtonClass: "el-button--danger"
    }
  );
  try {
    await api.post(`/stock/check_order/${row.id}/void`);
    ElMessage.success("作废成功");
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "作废失败");
  }
}

async function handleAdjust(row: any) {
  await ElMessageBox.confirm(
    `确定按盘点单「${row.check_no}」调整库存？将以实盘数更新库存并生成流水。`,
    "提示",
    { type: "warning" }
  );
  await api.post(`/stock/check_order/${row.id}/adjust`);
  ElMessage.success("库存调整成功");
  fetchData();
}

async function handleExport() {
  exporting.value = true;
  try {
    const params: any = {};
    if (searchForm.keyword) params.keyword = searchForm.keyword;
    if (filters.warehouse_code) params.warehouse_code = filters.warehouse_code;
    if (filters.status) params.status = filters.status;
    const resp = await api.get("/stock/check_order/export", {
      params,
      responseType: "blob"
    });
    const url = URL.createObjectURL(resp as any);
    const a = document.createElement("a");
    a.href = url;
    a.download = "盘点单.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("导出成功");
  } catch (e: any) {
    ElMessage.error("导出失败");
  } finally {
    exporting.value = false;
  }
}

function formatTime(v: string) {
  if (!v) return "—";
  return new Date(v)
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

onMounted(() => {
  fetchData();
  loadWarehouses();
});
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          {
            label: '盘点单总数',
            value: stats.total,
            color: 'var(--el-color-primary)',
            icon: Checked
          },
          {
            label: '草稿',
            value: stats.draft,
            color: 'var(--el-color-info)',
            icon: Document
          },
          {
            label: '已完成',
            value: stats.confirmed,
            color: '#67c23a',
            icon: AddFill
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

    <!-- ==================== 操作卡片 ==================== -->
    <div class="wms-card mb-4">
      <div :style="{ padding: '16px 20px' }">
        <div
          class="flex items-center gap-2 mb-3 text-sm font-semibold"
          :style="{ color: 'var(--el-text-color-primary)' }"
        >
          <span
            class="inline-block w-1 h-4 rounded"
            :style="{ background: 'var(--el-color-primary)' }"
          />
          操作
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <el-button
            v-if="hasPerms('stock-check:create')"
            type="primary"
            :icon="useRenderIcon(AddFill)"
            @click="router.push('/stock-check/form')"
            >新增盘点单</el-button
          >
          <PrintDropdown
            page-code="stock_check_order"
            :business-id="selectedRows[0]?.check_no || ''"
            :disabled="selectedRows.length !== 1"
          />
          <el-button
            plain
            :icon="useRenderIcon(Download)"
            :loading="exporting"
            @click="handleExport"
            >导出 Excel</el-button
          >
          <el-button
            plain
            :icon="useRenderIcon(Filter)"
            @click="drawerVisible = true"
          >
            筛选<template v-if="activeFilterCount"
              >&nbsp;{{ activeFilterCount }}</template
            >
          </el-button>
          <div class="flex-1" />
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索盘点单号..."
            clearable
            :prefix-icon="useRenderIcon(Search)"
            class="w-56!"
            @clear="fetchData"
            @keyup.enter="onSearch"
          />
        </div>
      </div>
      <div
        class="flex items-center"
        :style="{
          padding: '10px 20px',
          borderTop: '1px solid var(--el-border-color-lighter)'
        }"
      >
        <span
          class="text-xs"
          :style="{ color: 'var(--el-text-color-secondary)' }"
        >
          共
          <strong :style="{ color: 'var(--el-text-color-primary)' }">{{
            pagination.total
          }}</strong>
          个盘点单
        </span>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <PureTableBar
      title="盘点单管理"
      :columns="columns"
      storage-key="StockCheckOrderList"
      @refresh="onSearch"
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
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="pagination"
          :header-cell-style="headerCellStyle"
          @header-dragend="
            (newWidth, _oldWidth, col) =>
              onColumnResize(col.label || col.property, newWidth)
          "
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
          @selection-change="onSelectionChange"
        >
          <template #empty>
            <EmptyState title="暂无盘点单数据" />
          </template>
          <template #status="{ row }">
            <el-tag
              :type="formatCheckStatus(row.status).type"
              effect="plain"
              size="small"
              >{{ formatCheckStatus(row.status).label }}</el-tag
            >
          </template>
          <template #create_time="{ row }">{{
            formatTime(row.create_time)
          }}</template>
          <template #operation="{ row }">
            <div class="flex justify-center gap-1">
              <el-button
                link
                type="primary"
                size="small"
                @click="router.push(`/stock-check/detail/${row.id}`)"
                >查看</el-button
              >
              <el-button
                v-if="hasPerms('stock-check:edit') && row.status === 'draft'"
                link
                type="primary"
                size="small"
                @click="router.push(`/stock-check/form/${row.id}`)"
                >编辑</el-button
              >
              <el-button
                v-if="hasPerms('stock-check:edit') && row.status === 'draft'"
                type="danger"
                size="small"
                :loading="deleting === row.id"
                @click="handleDelete(row)"
                >删除</el-button
              >
              <el-button
                v-if="hasPerms('stock-check:audit') && row.status === 'draft'"
                link
                type="warning"
                size="small"
                @click="handleConfirm(row)"
                >确认</el-button
              >
              <el-button
                v-if="
                  hasPerms('stock-check:audit') && row.status === 'confirmed'
                "
                link
                type="danger"
                size="small"
                @click="handleVoid(row)"
                >作废</el-button
              >
              <el-button
                v-if="
                  hasPerms('stock-check:audit') && row.status === 'confirmed'
                "
                link
                type="success"
                size="small"
                @click="handleAdjust(row)"
                >调整</el-button
              >
            </div>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 筛选抽屉 -->
    <el-drawer v-model="drawerVisible" title="筛选条件" size="340px">
      <el-form :model="filters" label-width="100px">
        <el-form-item label="仓库">
          <el-select
            v-model="filters.warehouse_code"
            clearable
            filterable
            class="w-full!"
          >
            <el-option
              v-for="w in warehouses"
              :key="w.warehouse_code"
              :label="w.warehouse_name"
              :value="w.warehouse_code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable class="w-full!">
            <el-option
              v-for="s in statusFilterOptions"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">关闭</el-button>
        <el-button type="primary" :loading="loading" @click="applyFilters"
          >查询</el-button
        >
        <el-button @click="resetFilters">重置</el-button>
      </template>
    </el-drawer>
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
</style>

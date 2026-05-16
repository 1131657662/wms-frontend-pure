<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import InventorySettlementProductGroup from "./InventorySettlementProductGroup.vue";
import InventorySettlementNameSummary from "./InventorySettlementNameSummary.vue";
import type { ProductOption, WarehouseTab } from "./inventorySettlementTypes";
import Calendar from "~icons/ri/calendar-2-line";
import Search from "~icons/ep/search";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";
import Document from "~icons/ep/document";
import Goods from "~icons/ep/goods";
import RefreshRight from "~icons/ep/refresh-right";
import OfficeBuilding from "~icons/ep/office-building";
import Collection from "~icons/ep/collection";
import List from "~icons/ep/list";

defineOptions({ name: "InventorySettlement" });

const now = new Date();
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const GROUP_PAGE_KEY = "page-size-InventorySettlement-groups";

const warehouseTabs = ref<WarehouseTab[]>([]);
const productOptions = ref<ProductOption[]>([]);
const activeWarehouse = ref("");
const activeProductName = ref("");
const warehouseView = ref<"detail" | "summary">("detail");
const loading = ref(false);
const exporting = ref(false);
const periodLabel = ref("");

const filter = reactive({
  month: defaultMonth,
  product_codes: [] as string[]
});

const groupPagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem(GROUP_PAGE_KEY)) || 6,
  currentPage: 1,
  background: true,
  pageSizes: [4, 6, 10, 20]
});

const activeTabMeta = computed(() =>
  warehouseTabs.value.find(w => w.warehouse_code === activeWarehouse.value)
);

const activeGroups = computed(() => activeTabMeta.value?.groups ?? []);

const warehouseNameOptions = computed(
  () => activeTabMeta.value?.nameOptions ?? []
);

const pageStats = computed(() => {
  const warehouses = warehouseTabs.value;
  const codes = warehouses.reduce((n, w) => n + (w.groups?.length ?? 0), 0);
  const rows = warehouses.reduce((n, w) => n + (w.total ?? 0), 0);
  return {
    warehouseCount: warehouses.length,
    codeCount: codes,
    rowCount: rows
  };
});

const filteredGroups = computed(() => {
  if (!activeProductName.value) return activeGroups.value;
  return activeGroups.value.filter(
    g =>
      (String(g.product_name ?? "").trim() || "（未命名）") ===
      activeProductName.value
  );
});

const paginatedGroups = computed(() => {
  const groups = filteredGroups.value;
  const start = (groupPagination.currentPage - 1) * groupPagination.pageSize;
  return groups.slice(start, start + groupPagination.pageSize);
});

const groupPageOffset = computed(
  () => (groupPagination.currentPage - 1) * groupPagination.pageSize
);

function syncGroupPagination() {
  groupPagination.total = filteredGroups.value.length;
  const maxPage = Math.max(
    1,
    Math.ceil(groupPagination.total / groupPagination.pageSize) || 1
  );
  if (groupPagination.currentPage > maxPage) {
    groupPagination.currentPage = maxPage;
  }
}

function buildQueryParams(): Record<string, string> {
  const params: Record<string, string> = { month: filter.month };
  if (filter.product_codes.length) {
    params.product_codes = filter.product_codes.join(",");
  }
  return params;
}

async function fetchData() {
  if (!filter.month) {
    ElMessage.warning("请选择月份");
    return;
  }
  loading.value = true;
  try {
    const res = await api.get("/report/inventory-settlement", {
      params: buildQueryParams()
    });
    const data = res.data as {
      warehouses?: WarehouseTab[];
      productOptions?: ProductOption[];
      startDate?: string;
      endDate?: string;
    };
    warehouseTabs.value = (data?.warehouses ?? []).map(wh => ({
      ...wh,
      groups: wh.groups ?? []
    }));
    productOptions.value = data?.productOptions ?? [];

    if (
      !activeWarehouse.value ||
      !warehouseTabs.value.some(w => w.warehouse_code === activeWarehouse.value)
    ) {
      activeWarehouse.value = warehouseTabs.value[0]?.warehouse_code ?? "";
    }

    periodLabel.value =
      data?.startDate && data?.endDate
        ? `${data.startDate} 至 ${data.endDate}`
        : filter.month;

    groupPagination.currentPage = 1;
    syncGroupPagination();
  } finally {
    loading.value = false;
  }
}

function search() {
  groupPagination.currentPage = 1;
  fetchData();
}

function reset() {
  filter.month = defaultMonth;
  filter.product_codes = [];
}

function onTabChange() {
  activeProductName.value = "";
  warehouseView.value = "detail";
  groupPagination.currentPage = 1;
  syncGroupPagination();
}

function selectProductName(name: string) {
  activeProductName.value = activeProductName.value === name ? "" : name;
}

function onNameFilterChange() {
  groupPagination.currentPage = 1;
  syncGroupPagination();
}

function onGroupPageChange(p: number) {
  groupPagination.currentPage = p;
}

function onGroupPageSizeChange(s: number) {
  localStorage.setItem(GROUP_PAGE_KEY, String(s));
  groupPagination.pageSize = s;
  groupPagination.currentPage = 1;
  syncGroupPagination();
}

const exportFileName = computed(() => `库存结算对账单_${filter.month}.xlsx`);

async function exportData() {
  if (!filter.month) {
    ElMessage.warning("请选择月份后再导出");
    return;
  }
  exporting.value = true;
  try {
    const res = await api.get("/report/inventory-settlement/export", {
      params: buildQueryParams(),
      responseType: "blob"
    });
    const url = URL.createObjectURL(res as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName.value;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("导出成功（按仓库分工作表，含分组小计）");
  } finally {
    exporting.value = false;
  }
}

watch(activeWarehouse, onTabChange);
watch(activeProductName, onNameFilterChange);

onMounted(fetchData);
</script>

<template>
  <div class="settlement-page">
    <header class="settlement-page-head">
      <div>
        <h1 class="settlement-page-title">库存结算对账单</h1>
        <p class="settlement-page-desc">
          按月核算进出货、结存与存储天数，支持按仓库与产品编码筛选
        </p>
      </div>
    </header>

    <section
      v-if="pageStats.warehouseCount && !loading"
      class="settlement-stats"
      aria-label="数据概览"
    >
      <div class="stat-card">
        <span class="stat-icon stat-icon--warehouse">
          <component :is="useRenderIcon(OfficeBuilding)" />
        </span>
        <div class="stat-body">
          <span class="stat-label">仓库</span>
          <span class="stat-value">{{ pageStats.warehouseCount }}</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon stat-icon--code">
          <component :is="useRenderIcon(Collection)" />
        </span>
        <div class="stat-body">
          <span class="stat-label">产品编码</span>
          <span class="stat-value">{{ pageStats.codeCount }}</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon stat-icon--rows">
          <component :is="useRenderIcon(List)" />
        </span>
        <div class="stat-body">
          <span class="stat-label">流水笔数</span>
          <span class="stat-value">{{ pageStats.rowCount }}</span>
        </div>
      </div>
    </section>

    <section class="wms-card settlement-filter-card">
      <div class="card-section-title">
        <span class="card-section-mark" />
        <span>筛选条件</span>
      </div>
      <div class="filter-toolbar">
        <el-form :inline="true" class="filter-form">
          <el-form-item label="结算月份">
            <el-date-picker
              v-model="filter.month"
              type="month"
              placeholder="选择月份"
              value-format="YYYY-MM"
              :prefix-icon="useRenderIcon(Calendar)"
              class="w-40!"
            />
          </el-form-item>
          <el-form-item label="产品编码">
            <el-select
              v-model="filter.product_codes"
              multiple
              filterable
              clearable
              collapse-tags
              collapse-tags-tooltip
              :max-collapse-tags="2"
              placeholder="全部产品（可多选）"
              :prefix-icon="useRenderIcon(Goods)"
              class="w-80! settlement-product-select"
            >
              <el-option
                v-for="opt in productOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <el-divider direction="vertical" class="filter-divider" />
        <div class="filter-actions">
          <el-button
            type="primary"
            :icon="useRenderIcon(Search)"
            :loading="loading"
            @click="search"
          >
            查询
          </el-button>
          <el-button :icon="useRenderIcon(Refresh)" @click="reset">
            重置
          </el-button>
          <el-button
            type="success"
            plain
            :icon="useRenderIcon(Download)"
            :loading="exporting"
            @click="exportData"
          >
            导出 Excel
          </el-button>
        </div>
      </div>

      <div v-if="periodLabel" class="settlement-meta-bar">
        <div class="meta-group">
          <span class="meta-icon" aria-hidden="true">
            <component :is="useRenderIcon(Document)" />
          </span>
          <span class="meta-label">制表区间</span>
          <span class="meta-value">{{ periodLabel }}</span>
        </div>
        <span class="meta-sep" aria-hidden="true" />
        <p class="meta-tip">
          默认查看<strong>对账明细</strong>；品名维度汇总请切换仓库区
          <strong>品名汇总</strong>
        </p>
      </div>
    </section>

    <section v-if="warehouseTabs.length" class="wms-card settlement-tabs-card">
      <el-tabs v-model="activeWarehouse" class="settlement-warehouse-tabs">
        <el-tab-pane
          v-for="wh in warehouseTabs"
          :key="wh.warehouse_code"
          :name="wh.warehouse_code"
        >
          <template #label>
            <span class="tab-label">{{ wh.warehouse_name }}</span>
            <el-tag
              v-if="(wh.groups?.length ?? 0) > 0"
              size="small"
              round
              class="tab-count"
              type="primary"
              effect="plain"
            >
              {{ wh.groups.length }}
            </el-tag>
          </template>
        </el-tab-pane>
      </el-tabs>
    </section>

    <section
      v-if="activeTabMeta"
      v-loading="loading"
      class="wms-card settlement-body"
    >
      <header class="settlement-header">
        <div class="settlement-header-main">
          <h2 class="settlement-title">{{ activeTabMeta.warehouse_name }}</h2>
          <p class="settlement-subtitle">
            <template v-if="warehouseView === 'detail'">
              <span
                >{{ filteredGroups.length }} /
                {{ activeGroups.length }} 编码</span
              >
              <span v-if="activeTabMeta.total" class="subtitle-sep">·</span>
              <span v-if="activeTabMeta.total"
                >{{ activeTabMeta.total }} 笔流水</span
              >
            </template>
            <template v-else>
              <span
                >{{ activeTabMeta.nameSummary?.rows?.length ?? 0 }} 个品名</span
              >
            </template>
          </p>
        </div>
        <div class="settlement-header-actions">
          <el-radio-group
            v-model="warehouseView"
            size="default"
            class="settlement-view-switch"
          >
            <el-radio-button value="detail">对账明细</el-radio-button>
            <el-radio-button value="summary">品名汇总</el-radio-button>
          </el-radio-group>
          <el-button
            text
            type="primary"
            :icon="useRenderIcon(RefreshRight)"
            :loading="loading"
            @click="search"
          >
            刷新
          </el-button>
        </div>
      </header>

      <div v-show="warehouseView === 'summary'" class="settlement-panel">
        <InventorySettlementNameSummary
          v-if="activeTabMeta.nameSummary?.rows?.length"
          :rows="activeTabMeta.nameSummary.rows"
          :total="activeTabMeta.nameSummary.total"
        />
        <EmptyState
          v-else-if="!loading"
          title="暂无汇总数据"
          description="该仓库当月无对账流水，请切换月份或仓库"
        />
      </div>

      <div v-show="warehouseView === 'detail'" class="settlement-panel">
        <div
          v-if="warehouseNameOptions.length"
          class="name-chip-scroll"
          role="tablist"
          aria-label="按品名筛选"
        >
          <div class="name-chip-bar">
            <button
              type="button"
              class="name-chip"
              :class="{ 'name-chip--active': !activeProductName }"
              @click="activeProductName = ''"
            >
              全部
            </button>
            <button
              v-for="name in warehouseNameOptions"
              :key="name"
              type="button"
              class="name-chip"
              :class="{ 'name-chip--active': activeProductName === name }"
              @click="selectProductName(name)"
            >
              {{ name }}
            </button>
          </div>
        </div>

        <div class="settlement-legend" aria-label="图例说明">
          <span class="legend-pill legend-pill--in">
            <i class="legend-dot" />进仓
          </span>
          <span class="legend-pill legend-pill--out">
            <i class="legend-dot" />出仓
          </span>
          <span class="legend-pill legend-pill--balance">
            <i class="legend-dot" />结存
          </span>
          <span class="legend-pill legend-pill--open">
            <i class="legend-dot" />期初
          </span>
        </div>

        <div class="settlement-groups-wrap">
          <template v-if="paginatedGroups.length">
            <InventorySettlementProductGroup
              v-for="(g, i) in paginatedGroups"
              :key="g.group_key"
              :group="g"
              :index="groupPageOffset + i + 1"
            />
          </template>
          <EmptyState
            v-else-if="!loading"
            title="暂无对账数据"
            :description="
              activeProductName
                ? `品名「${activeProductName}」下暂无明细，可点「全部」或切换品名`
                : filter.product_codes.length
                  ? '当前仓库在所选月份/产品下无流水'
                  : '该仓库当月可能无进出货'
            "
          />
        </div>

        <footer
          v-if="filteredGroups.length"
          class="settlement-group-pagination"
        >
          <el-pagination
            v-model:current-page="groupPagination.currentPage"
            v-model:page-size="groupPagination.pageSize"
            :total="groupPagination.total"
            :page-sizes="groupPagination.pageSizes"
            :background="groupPagination.background"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="onGroupPageChange"
            @size-change="onGroupPageSizeChange"
          />
        </footer>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settlement-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 20px;
}

.settlement-page-head {
  margin-bottom: 4px;
}

.settlement-page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--el-text-color-primary);
  letter-spacing: -0.02em;
}

.settlement-page-desc {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.settlement-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (width <= 768px) {
  .settlement-stats {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  border-radius: 10px;
}

.stat-icon--warehouse {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.stat-icon--code {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.stat-icon--rows {
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.settlement-filter-card {
  padding: 20px 24px 22px;
}

.card-section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 18px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.card-section-mark {
  width: 3px;
  height: 14px;
  background: var(--el-color-primary);
  border-radius: 2px;
}

.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-start;
}

.filter-form :deep(.el-form-item) {
  margin-right: 20px;
  margin-bottom: 0;
}

.filter-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.filter-divider {
  height: 32px;
  margin: 4px 4px 0;
}

.filter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-top: 2px;
}

.settlement-meta-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  align-items: center;
  padding: 14px 16px;
  margin-top: 20px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
}

.meta-group {
  display: inline-flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
}

.meta-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 14px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
}

.meta-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.meta-value {
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.meta-sep {
  flex-shrink: 0;
  width: 1px;
  height: 20px;
  background: var(--el-border-color);
}

.meta-tip {
  flex: 1;
  min-width: 200px;
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.meta-tip strong {
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.settlement-tabs-card {
  padding: 8px 16px 0;
}

.settlement-body {
  min-height: 320px;
  padding: 20px 24px 24px;
}

.settlement-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 18px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.settlement-header-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}

.settlement-view-switch :deep(.el-radio-button__inner) {
  padding: 8px 16px;
  font-weight: 500;
}

.settlement-panel {
  min-height: 200px;
}

.settlement-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.settlement-subtitle {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.subtitle-sep {
  color: var(--el-text-color-placeholder);
}

.name-chip-scroll {
  padding-bottom: 4px;
  margin-bottom: 14px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.name-chip-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  min-width: min-content;
  padding: 2px 0;
}

.name-chip {
  flex-shrink: 0;
  padding: 6px 14px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
}

.name-chip:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
}

.name-chip--active {
  font-weight: 600;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 1px 2px rgb(64 158 255 / 12%);
}

.settlement-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.legend-pill {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.legend-pill--in .legend-dot {
  background: var(--el-color-success);
}

.legend-pill--out .legend-dot {
  background: var(--el-color-warning);
}

.legend-pill--balance .legend-dot {
  background: var(--el-color-primary);
}

.legend-pill--open .legend-dot {
  background: var(--el-color-info-light-5);
  box-shadow: inset 0 0 0 1px var(--el-color-info-light-3);
}

.legend-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.settlement-groups-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 160px;
}

.settlement-group-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  margin-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.settlement-warehouse-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.settlement-warehouse-tabs :deep(.el-tabs__item) {
  height: 44px;
  font-weight: 500;
}

.settlement-warehouse-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.tab-label {
  margin-right: 4px;
}

.tab-count {
  vertical-align: middle;
}

.settlement-product-select :deep(.el-select__tags) {
  max-width: 100%;
}

@media (width <= 640px) {
  .settlement-page {
    padding: 12px;
  }

  .settlement-meta-bar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .meta-sep {
    display: none;
  }

  .settlement-header {
    flex-direction: column;
  }

  .settlement-header-actions {
    justify-content: space-between;
    width: 100%;
  }
}
</style>

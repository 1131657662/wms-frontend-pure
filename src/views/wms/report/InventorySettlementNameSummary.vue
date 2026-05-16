<script setup lang="ts">
import { computed } from "vue";
import type { NameSummaryRow } from "./inventorySettlementTypes";
import { formatSummaryQty, formatWeight } from "./inventorySettlementUi";

defineOptions({ name: "InventorySettlementNameSummary" });

const props = defineProps<{
  rows: NameSummaryRow[];
  total: NameSummaryRow | null;
}>();

const kpis = computed(() => {
  const t = props.total;
  if (!t) return [];
  return [
    {
      key: "in",
      label: "进仓",
      qty: formatSummaryQty(t.in_qty),
      weight: formatWeight(t.in_weight),
      tone: "in"
    },
    {
      key: "out",
      label: "出仓",
      qty: formatSummaryQty(t.out_qty),
      weight: formatWeight(t.out_weight),
      tone: "out"
    },
    {
      key: "balance",
      label: "结存",
      qty: formatSummaryQty(t.balance_qty),
      weight: formatWeight(t.balance_weight),
      tone: "balance"
    },
    {
      key: "sku",
      label: "产品编码数",
      qty: String(t.sku_count ?? 0),
      weight: "",
      tone: "neutral"
    }
  ];
});

const tableRows = computed(() => props.rows);
</script>

<template>
  <div class="summary-view">
    <div v-if="kpis.length" class="summary-kpis">
      <div
        v-for="item in kpis"
        :key="item.key"
        class="summary-kpi"
        :class="`summary-kpi--${item.tone}`"
      >
        <span class="summary-kpi-label">{{ item.label }}</span>
        <span v-if="item.key === 'sku'" class="summary-kpi-weight">{{
          item.qty
        }}</span>
        <template v-else>
          <span class="summary-kpi-weight">
            {{ item.weight }}<span class="summary-kpi-unit">吨</span>
          </span>
          <span class="summary-kpi-qty">{{ item.qty }} 件</span>
        </template>
        <span v-if="item.key === 'sku'" class="summary-kpi-qty"
          >个不同编码</span
        >
      </div>
    </div>

    <div class="summary-table-wrap">
      <el-table
        :data="tableRows"
        size="default"
        class="summary-table"
        :max-height="420"
        :row-class-name="({ row }) => (row._isTotal ? 'is-total' : '')"
      >
        <el-table-column
          prop="product_name"
          label="品名"
          min-width="108"
          fixed
          show-overflow-tooltip
        />
        <el-table-column label="进仓" align="right" min-width="112">
          <template #default="{ row }">
            <div class="metric-cell metric-cell--in">
              <div class="metric-main">
                <span class="metric-value">{{
                  formatWeight(row.in_weight)
                }}</span>
                <span class="metric-unit">吨</span>
              </div>
              <div class="metric-sub">
                {{ formatSummaryQty(row.in_qty) }} 件
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="出仓" align="right" min-width="112">
          <template #default="{ row }">
            <div class="metric-cell metric-cell--out">
              <div class="metric-main">
                <span class="metric-value">{{
                  formatWeight(row.out_weight)
                }}</span>
                <span class="metric-unit">吨</span>
              </div>
              <div class="metric-sub">
                {{ formatSummaryQty(row.out_qty) }} 件
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="结存" align="right" min-width="112">
          <template #default="{ row }">
            <div class="metric-cell metric-cell--balance">
              <div class="metric-main">
                <span class="metric-value">{{
                  formatWeight(row.balance_weight)
                }}</span>
                <span class="metric-unit">吨</span>
              </div>
              <div class="metric-sub">
                {{ formatSummaryQty(row.balance_qty) }} 件
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column width="92" align="right">
          <template #header>
            <el-tooltip
              content="该品名下有多少个不同的产品编码（对账明细里的编码分组数）"
              placement="top"
            >
              <span class="summary-col-head">编码数</span>
            </el-tooltip>
          </template>
          <template #default="{ row }">{{ row.sku_count ?? "—" }}</template>
        </el-table-column>
      </el-table>

      <footer v-if="total" class="summary-footer">
        <span class="summary-footer-label">本仓合计</span>
        <span class="summary-footer-metric metric-cell--in">
          进 {{ formatWeight(total.in_weight) }} 吨 /
          {{ formatSummaryQty(total.in_qty) }} 件
        </span>
        <span class="summary-footer-sep">·</span>
        <span class="summary-footer-metric metric-cell--out">
          出 {{ formatWeight(total.out_weight) }} 吨 /
          {{ formatSummaryQty(total.out_qty) }} 件
        </span>
        <span class="summary-footer-sep">·</span>
        <span class="summary-footer-metric metric-cell--balance">
          存 {{ formatWeight(total.balance_weight) }} 吨 /
          {{ formatSummaryQty(total.balance_qty) }} 件
        </span>
      </footer>
    </div>

    <p class="summary-footnote">
      按品名合并统计；「编码数」=
      该品名下不同产品编码的个数（与对账明细中的编码分组一致）。
    </p>
  </div>
</template>

<style scoped>
.summary-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

@media (width <= 960px) {
  .summary-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.summary-kpi {
  padding: 14px 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.summary-kpi-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-kpi-weight {
  display: block;
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.summary-kpi-unit {
  margin-left: 2px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.summary-kpi-qty {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-kpi--in .summary-kpi-weight {
  color: var(--el-color-success);
}

.summary-kpi--out .summary-kpi-weight {
  color: var(--el-color-warning);
}

.summary-kpi--balance .summary-kpi-weight {
  color: var(--el-color-primary);
}

.summary-kpi--neutral .summary-kpi-weight {
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.summary-table-wrap {
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.summary-table {
  --el-table-border-color: var(--el-border-color-lighter);
}

.summary-table :deep(.el-table__header th) {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
}

.summary-col-head {
  cursor: help;
  border-bottom: 1px dashed var(--el-border-color);
}

.metric-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
  line-height: 1.3;
}

.metric-main {
  display: inline-flex;
  gap: 2px;
  align-items: baseline;
  justify-content: flex-end;
  white-space: nowrap;
}

.metric-value {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.metric-unit {
  font-size: 11px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.metric-sub {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.metric-cell--in .metric-value {
  color: var(--el-color-success);
}

.metric-cell--out .metric-value {
  color: var(--el-color-warning);
}

.metric-cell--balance .metric-value {
  color: var(--el-color-primary);
}

.summary-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  padding: 12px 16px;
  font-size: 13px;
  background: var(--el-fill-color-light);
  border-top: 1px solid var(--el-border-color-lighter);
}

.summary-footer-label {
  margin-right: 4px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.summary-footer-sep {
  color: var(--el-text-color-placeholder);
}

.summary-footer-metric {
  font-variant-numeric: tabular-nums;
}

.summary-footnote {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>

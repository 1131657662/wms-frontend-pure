<script setup lang="ts">
import type { ProductGroup } from "./inventorySettlementTypes";
import {
  formatQty,
  formatWeight,
  metricClass,
  metricTone,
  rowClassName,
  rowTypeMeta
} from "./inventorySettlementUi";

defineOptions({ name: "InventorySettlementProductGroup" });

const props = defineProps<{
  group: ProductGroup;
  index: number;
}>();

const tableRows = () =>
  props.group.rows.map((r, i) => ({
    ...r,
    rowKey: `${props.group.group_key}-${i}-${r.biz_date}-${r.row_type}`
  }));
</script>

<template>
  <section class="settlement-product-group">
    <header class="group-header">
      <div class="group-header-main">
        <span class="group-index">{{ index }}</span>
        <el-tag
          v-if="group.product_code"
          effect="dark"
          type="primary"
          size="small"
          round
          class="group-code-tag"
        >
          {{ group.product_code }}
        </el-tag>
        <div class="group-title">
          <span class="group-name">{{ group.product_name || "—" }}</span>
          <span v-if="group.product_model" class="group-model">{{
            group.product_model
          }}</span>
        </div>
      </div>
      <span class="group-meta">{{ group.rows.length }} 笔流水</span>
    </header>

    <el-table
      :data="tableRows()"
      row-key="rowKey"
      size="small"
      border
      class="group-table"
      :row-class-name="rowClassName"
      :header-cell-style="{
        background: 'var(--el-fill-color-light)',
        color: 'var(--el-text-color-secondary)',
        fontWeight: 600,
        fontSize: '12px'
      }"
    >
      <el-table-column
        prop="biz_date_label"
        label="日期"
        width="96"
        align="center"
      />
      <el-table-column label="类型" width="80" align="center">
        <template #default="{ row }">
          <el-tag
            :type="rowTypeMeta(row.row_type).tagType"
            :effect="rowTypeMeta(row.row_type).tagEffect"
            size="small"
            round
            class="type-tag"
          >
            {{ row.row_type_label || rowTypeMeta(row.row_type).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="上月结存" align="right" min-width="108">
        <template #default="{ row }">
          <div :class="metricClass(metricTone('open', row.open_weight))">
            {{ formatWeight(row.open_weight) }}
            <span class="metric-unit">吨</span>
          </div>
          <div
            class="metric-sub"
            :class="metricClass(metricTone('open', row.open_qty))"
          >
            {{ formatQty(row.open_qty) }} 件
          </div>
        </template>
      </el-table-column>
      <el-table-column label="进仓" align="right" min-width="100">
        <template #default="{ row }">
          <div :class="metricClass(metricTone('in', row.in_weight))">
            {{ formatWeight(row.in_weight) }}
            <span class="metric-unit">吨</span>
          </div>
          <div
            class="metric-sub"
            :class="metricClass(metricTone('in', row.in_qty))"
          >
            {{ formatQty(row.in_qty) }} 件
          </div>
        </template>
      </el-table-column>
      <el-table-column label="出仓" align="right" min-width="100">
        <template #default="{ row }">
          <div :class="metricClass(metricTone('out', row.out_weight))">
            {{ formatWeight(row.out_weight) }}
            <span class="metric-unit">吨</span>
          </div>
          <div
            class="metric-sub"
            :class="metricClass(metricTone('out', row.out_qty))"
          >
            {{ formatQty(row.out_qty) }} 件
          </div>
        </template>
      </el-table-column>
      <el-table-column label="结存" align="right" min-width="108">
        <template #default="{ row }">
          <div :class="metricClass(metricTone('balance', row.balance_weight))">
            {{ formatWeight(row.balance_weight) }}
            <span class="metric-unit">吨</span>
          </div>
          <div
            class="metric-sub"
            :class="metricClass(metricTone('balance', row.balance_qty))"
          >
            {{ formatQty(row.balance_qty) }} 件
          </div>
        </template>
      </el-table-column>
      <el-table-column label="天数" width="64" align="right">
        <template #default="{ row }">
          <span
            v-if="row.storage_days != null && row.storage_days !== ''"
            class="storage-days-value"
          >
            {{ row.storage_days }}
          </span>
          <span v-else class="storage-days-empty">—</span>
        </template>
      </el-table-column>
    </el-table>

    <footer class="group-footer">
      <span class="footer-label">本月小计</span>
      <span :class="metricClass('in')">
        入库 <strong>{{ formatWeight(group.subtotal.in_weight) }}</strong> 吨
      </span>
      <span class="footer-sep">·</span>
      <span :class="metricClass('out')">
        出库 <strong>{{ formatWeight(group.subtotal.out_weight) }}</strong> 吨
      </span>
      <span class="footer-sep">·</span>
      <span :class="metricClass('balance')">
        结存
        <strong>{{ formatWeight(group.subtotal.balance_weight) }}</strong> 吨
      </span>
      <span class="footer-qty">
        进 {{ formatQty(group.subtotal.in_qty) }} 件 / 出
        {{ formatQty(group.subtotal.out_qty) }} 件
      </span>
    </footer>
  </section>
</template>

<style scoped>
.settlement-product-group {
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
  transition: box-shadow 0.2s;
}

.settlement-product-group:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 6%);
}

.group-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(
    90deg,
    var(--el-color-primary-light-9) 0%,
    var(--el-fill-color-blank) 48%
  );
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.group-header-main {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.group-index {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  font-size: 11px;
  font-weight: 700;
  line-height: 22px;
  color: var(--el-color-primary);
  text-align: center;
  background: var(--el-color-primary-light-8);
  border-radius: 6px;
}

.group-code-tag {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.group-title {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
  min-width: 0;
}

.group-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.group-model {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.group-meta {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.group-table {
  --el-table-border-color: var(--el-border-color-lighter);
}

.group-table :deep(.el-table__cell) {
  padding: 8px 0;
}

.group-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  font-size: 13px;
  background: var(--el-fill-color-light);
  border-top: 1px solid var(--el-border-color-lighter);
}

.footer-label {
  margin-right: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.footer-sep {
  color: var(--el-text-color-placeholder);
}

.footer-qty {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.metric-sub {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.2;
}

.metric-unit {
  margin-left: 2px;
  font-size: 11px;
  font-weight: 400;
  opacity: 0.85;
}

.settlement-metric {
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
}

.settlement-metric--in {
  font-weight: 600;
  color: var(--el-color-success);
}

.settlement-metric--out {
  font-weight: 600;
  color: var(--el-color-warning);
}

.settlement-metric--balance {
  font-weight: 600;
  color: var(--el-color-primary);
}

.settlement-metric--open {
  color: var(--el-text-color-regular);
}

.settlement-metric--zero {
  color: var(--el-text-color-placeholder);
}

.group-table :deep(.settlement-row-opening td) {
  background: var(--el-color-info-light-9) !important;
}

.group-table :deep(.settlement-row-inbound td) {
  background: var(--el-color-success-light-9) !important;
}

.group-table :deep(.settlement-row-outbound td) {
  background: var(--el-color-warning-light-9) !important;
}

.group-table :deep(.el-table__row:hover > td) {
  filter: brightness(0.98);
}

.type-tag {
  justify-content: center;
  min-width: 44px;
}

.storage-days-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-primary);
}

.storage-days-empty {
  color: var(--el-text-color-placeholder);
}
</style>

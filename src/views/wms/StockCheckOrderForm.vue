<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { QuickAddSelect } from "@/components/QuickAddSelect";
import api from "@/api/wms";

defineOptions({ name: "StockCheckOrderForm" });

const route = useRoute();
const router = useRouter();
const isEdit = computed(() => !!route.params.id);

let _id = 0;
function uid() {
  return "d_" + ++_id + "_" + Date.now();
}

const warehouses = ref<any[]>([]);
const stockLoading = ref(false);
const saving = ref(false);

const form = reactive({ warehouse_code: "", remark: "", check_no: "" });
const details = ref<any[]>([]);

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

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

async function loadWarehouses() {
  const res = await api.get("/warehouse/list", {
    params: { pageSize: 500, enabled: 1 }
  });
  warehouses.value = res.data.list || [];
}

async function onWarehouseChange(_code: string) {
  await loadStock();
}

async function loadStock() {
  stockLoading.value = true;
  try {
    const params: any = { pageSize: 500 };
    if (form.warehouse_code) params.warehouse_code = form.warehouse_code;
    const res = await api.get("/stock/list", { params });
    details.value = (res.data.list || []).map((s: any) => ({
      uuid: uid(),
      warehouse_name: s.warehouse_name || form.warehouse_code || "",
      product_code: s.product_code,
      product_name: s.product_name,
      product_model: s.product_model,
      before_qty: s.stock_qty,
      before_weight: Number(s.stock_weight),
      actual_qty: s.stock_qty,
      actual_weight: Number(s.stock_weight),
      remark: ""
    }));
  } finally {
    stockLoading.value = false;
  }
}

async function handleSave() {
  if (!form.warehouse_code) {
    ElMessage.warning("请选择仓库");
    return;
  }
  if (details.value.length === 0) {
    ElMessage.warning("请先加载库存");
    return;
  }
  saving.value = true;
  try {
    const payload = {
      warehouse_code: form.warehouse_code,
      remark: form.remark,
      details: details.value.map((d: any) => ({
        product_code: d.product_code,
        product_name: d.product_name,
        product_model: d.product_model,
        before_qty: d.before_qty,
        before_weight: d.before_weight,
        actual_qty: d.actual_qty,
        actual_weight: d.actual_weight,
        diff_qty: (d.actual_qty || 0) - (d.before_qty || 0),
        diff_weight: (d.actual_weight || 0) - (d.before_weight || 0),
        remark: d.remark
      }))
    };
    if (isEdit.value) {
      await api.put(`/stock/check_order/${route.params.id}`, payload);
    } else {
      await api.post("/stock/check_order", payload);
    }
    ElMessage.success("保存成功");
    router.push("/stock-check/list");
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function loadData() {
  const res = await api.get("/stock/check_order/" + route.params.id);
  const { order, details: dets } = res.data;
  Object.assign(form, {
    warehouse_code: order.warehouse_code || "",
    remark: order.remark || "",
    check_no: order.check_no || ""
  });
  details.value =
    dets && dets.length > 0
      ? dets.map((d: any) => ({
          uuid: (d as any).uuid || uid(),
          warehouse_name:
            (d as any).warehouse_name || form.warehouse_code || "",
          product_code: d.product_code,
          product_name: d.product_name,
          product_model: d.product_model,
          before_qty: d.before_qty,
          before_weight: Number(d.before_weight),
          actual_qty: d.actual_qty,
          actual_weight: Number(d.actual_weight),
          remark: d.remark || ""
        }))
      : [];
}

onMounted(async () => {
  await loadWarehouses();
  if (isEdit.value) await loadData();
});
</script>

<template>
  <div class="px-5 py-4">
    <!-- 主表信息卡片 -->
    <div class="wms-card mb-4" :style="{ padding: '20px 24px' }">
      <div class="flex-bc mb-5">
        <div
          class="flex items-center gap-2 text-sm font-semibold"
          :style="{ color: 'var(--el-text-color-primary)' }"
        >
          <span
            class="inline-block w-1 h-4 rounded"
            :style="{ background: 'var(--el-color-primary)' }"
          />
          {{ isEdit ? "编辑盘点单" : "新增盘点单" }}
        </div>
        <div class="flex items-center gap-2">
          <el-button @click="router.push('/stock-check/list')">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave"
            >保存</el-button
          >
        </div>
      </div>
      <el-form :model="form" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="盘点单号">
              <el-input
                :model-value="form.check_no || '系统自动生成'"
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="仓库">
              <QuickAddSelect
                v-model="form.warehouse_code"
                :options="warehouses"
                entity-type="warehouse"
                filterable
                clearable
                class="w-full!"
                :disabled="isEdit"
                @change="onWarehouseChange"
                @added="loadWarehouses"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8" />
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <!-- 盘点明细卡片 -->
    <div class="wms-card mb-4" :style="{ padding: '20px 24px' }">
      <div class="flex-bc mb-4">
        <div
          class="flex items-center gap-2 text-sm font-semibold"
          :style="{ color: 'var(--el-text-color-primary)' }"
        >
          <span
            class="inline-block w-1 h-4 rounded"
            :style="{ background: 'var(--el-color-primary)' }"
          />
          盘点明细
        </div>
        <el-button
          type="primary"
          size="small"
          :loading="stockLoading"
          @click="loadStock"
          >加载库存</el-button
        >
      </div>
      <el-table
        border
        :data="details"
        stripe
        row-key="uuid"
        show-summary
        :summary-method="getSummary"
        :header-cell-style="headerCellStyle"
      >
        <el-table-column type="index" label="#" width="56" />
        <el-table-column
          prop="warehouse_name"
          label="仓库"
          width="140"
          show-overflow-tooltip
        />
        <el-table-column
          prop="product_code"
          label="产品编码"
          width="140"
          show-overflow-tooltip
        />
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
        <el-table-column prop="before_qty" label="盘点前件数" width="110" />
        <el-table-column prop="before_weight" label="盘点前吨位" width="120" />
        <el-table-column label="实盘件数" width="120">
          <template #default="{ row }">
            <el-input-number
              v-model="row.actual_qty"
              :min="0"
              :step="1"
              class="w-full!"
            />
          </template>
        </el-table-column>
        <el-table-column label="实盘吨位" width="150">
          <template #default="{ row }">
            <el-input-number
              v-model="row.actual_weight"
              :min="0"
              :step="0.0001"
              :precision="4"
              class="w-full!"
            />
          </template>
        </el-table-column>
        <el-table-column label="件数差异" width="90">
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
        <el-table-column label="吨位差异" width="110">
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
        <el-table-column label="备注" min-width="200">
          <template #default="{ row }">
            <el-input v-model="row.remark" />
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState title="请选择仓库后点击加载库存" />
        </template>
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

:deep(.el-input-number) {
  width: 100%;
}
</style>

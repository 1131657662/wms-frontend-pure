<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { QuickAddSelect } from "@/components/QuickAddSelect";
import api from "@/api/wms";

defineOptions({ name: "InboundOrderForm" });

const route = useRoute();
const router = useRouter();
const isEdit = computed(() => !!route.params.id);
const originalStatus = ref("");
let _id = 0;
function uid() {
  return "d_" + ++_id + "_" + Date.now();
}

const billTypes = [
  "采购入库",
  "退货入库",
  "调拨入库",
  "生产入库",
  "盘盈入库",
  "其他入库"
];
const warehouses = ref<any[]>([]);
const supplierOptions = ref<any[]>([]);
const supplierLoading = ref(false);
const productOptions = ref<any[]>([]);
const productLoading = ref(false);
const vehicleOptions = ref<any[]>([]);
const vehicleLoading = ref(false);
const saving = ref(false);
const formRef = ref();

const form = reactive({
  bill_type_code: "采购入库",
  warehouse_code: "",
  supplier_code: "",
  inbound_date: new Date().toISOString().slice(0, 10),
  vehicle_no: "",
  container_no: "",
  delivery_no: "",
  remark: "",
  order_no: "",
  lock_version: 0
});

const rules = {
  warehouse_code: [
    { required: true, message: "请选择仓库", trigger: "change" }
  ],
  supplier_code: [
    { required: true, message: "请选择供应商", trigger: "change" }
  ],
  inbound_date: [
    { required: true, message: "请选择入库日期", trigger: "change" }
  ],
  vehicle_no: [{ required: true, message: "请输入车号", trigger: "blur" }]
};

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

const details = ref<any[]>([initDetail()]);

function initDetail() {
  return {
    uuid: uid(),
    product_code: "",
    product_name: "",
    product_model: "",
    inbound_qty: null,
    inbound_weight: null,
    detail_remark: ""
  };
}

const totalQty = computed(() =>
  details.value.reduce((s, d) => s + (Number(d.inbound_qty) || 0), 0)
);
const totalWeight = computed(() =>
  details.value.reduce((s, d) => s + (Number(d.inbound_weight) || 0), 0)
);

function getSummary({ columns }: any) {
  const sums: any[] = [];
  columns.forEach((col: any, i: number) => {
    if (col.type === "index") sums[i] = "";
    else if (col.label === "产品编码") sums[i] = "合计";
    else if (col.label === "入库件数") sums[i] = totalQty.value;
    else if (col.label === "入库吨位") sums[i] = totalWeight.value.toFixed(4);
    else sums[i] = "";
  });
  return sums;
}

function addDetail() {
  details.value.push(initDetail());
}
function removeDetail(i: number) {
  details.value.splice(i, 1);
}

async function searchSupplier(keyword?: string) {
  supplierLoading.value = true;
  try {
    const res = await api.get("/supplier/list", {
      params: {
        page: 1,
        pageSize: 20,
        keyword: keyword || undefined,
        enabled: 1
      }
    });
    supplierOptions.value = res.data.list || [];
  } finally {
    supplierLoading.value = false;
  }
}

async function searchProduct(keyword?: string) {
  productLoading.value = true;
  try {
    const res = await api.get("/product/search", {
      params: { keyword: keyword || undefined }
    });
    productOptions.value = res.data || [];
  } finally {
    productLoading.value = false;
  }
}

async function searchVehicle(keyword?: string) {
  vehicleLoading.value = true;
  try {
    const res = await api.get("/vehicle/search", {
      params: { keyword: keyword || undefined }
    });
    vehicleOptions.value = res.data || [];
  } finally {
    vehicleLoading.value = false;
  }
}

function onProductChange(code: string, index: number) {
  const p = productOptions.value.find((p: any) => p.product_code === code);
  if (p) {
    details.value[index].product_name = p.product_name;
    details.value[index].product_model = p.product_model;
  } else {
    details.value[index].product_name = "";
    details.value[index].product_model = "";
  }
}

function validateDetails() {
  for (const d of details.value) {
    if (!d.product_code) {
      ElMessage.warning("请为每行选择产品");
      return false;
    }
    if (!d.inbound_qty || d.inbound_qty <= 0) {
      ElMessage.warning("入库件数必须大于0");
      return false;
    }
    if (!d.inbound_weight || d.inbound_weight <= 0) {
      ElMessage.warning("入库吨位必须大于0");
      return false;
    }
  }
  return true;
}

async function handleSaveDraft() {
  await formRef.value?.validate().catch(() => {});
  if (
    !form.warehouse_code ||
    !form.supplier_code ||
    !form.inbound_date ||
    !form.vehicle_no
  ) {
    ElMessage.warning("请填写必填字段");
    return;
  }
  if (!validateDetails()) return;
  saving.value = true;
  try {
    const payload = { ...form, order_status: "draft", details: details.value };
    if (isEdit.value)
      await api.put(`/inbound/order/${route.params.id}`, payload);
    else await api.post("/inbound/order", payload);
    ElMessage.success("保存成功");
    router.push("/inbound/list");
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function handleSubmit() {
  await formRef.value?.validate().catch(() => {});
  if (
    !form.warehouse_code ||
    !form.supplier_code ||
    !form.inbound_date ||
    !form.vehicle_no
  ) {
    ElMessage.warning("请填写必填字段");
    return;
  }
  if (!validateDetails()) return;
  saving.value = true;
  try {
    const payload = { ...form, order_status: "submit", details: details.value };
    if (isEdit.value) {
      await api.put(`/inbound/order/${route.params.id}`, payload);
      ElMessage.success("提交成功");
    } else {
      const res = await api.post("/inbound/order", payload);
      ElMessage.success("提交成功，单号：" + res.data.order_no);
    }
    router.push("/inbound/list");
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "提交失败");
  } finally {
    saving.value = false;
  }
}

async function loadData() {
  const res = await api.get("/inbound/order/" + route.params.id);
  const { order, details: dets } = res.data;
  originalStatus.value = order.order_status || "";
  Object.assign(form, {
    bill_type_code: order.bill_type_code || "入库单",
    warehouse_code: order.warehouse_code || "",
    supplier_code: order.supplier_code || "",
    inbound_date: order.inbound_date || "",
    vehicle_no: order.vehicle_no || "",
    container_no: order.container_no || "",
    delivery_no: order.delivery_no || "",
    remark: order.remark || "",
    order_no: order.order_no || "",
    lock_version: order.lock_version || 0
  });
  details.value =
    dets && dets.length > 0
      ? dets.map((d: any) => ({
          uuid: d.uuid,
          product_code: d.product_code,
          product_name: d.product_name,
          product_model: d.product_model,
          inbound_qty: Number(d.inbound_qty) || null,
          inbound_weight: Number(d.inbound_weight) || null,
          detail_remark: d.detail_remark || ""
        }))
      : [initDetail()];
  if (order.supplier_code) {
    await searchSupplier("");
    if (
      !supplierOptions.value.find(
        (s: any) => s.supplier_code === order.supplier_code
      )
    )
      supplierOptions.value.push({
        supplier_code: order.supplier_code,
        supplier_name: ""
      });
  }
  if (order.vehicle_no) {
    if (
      !vehicleOptions.value.find(
        (v: any) => v.plate_number === order.vehicle_no
      )
    )
      vehicleOptions.value.push({
        plate_number: order.vehicle_no,
        contact_name: ""
      });
  }
}

async function loadWarehouses() {
  const res = await api.get("/warehouse/list", {
    params: { pageSize: 1000, enabled: 1 }
  });
  warehouses.value = res.data.list || [];
}

onMounted(async () => {
  await loadWarehouses();
  await searchSupplier("");
  await searchVehicle("");
  if (isEdit.value) {
    await loadData();
  } else if (supplierOptions.value.length > 0) {
    form.supplier_code = supplierOptions.value[0].supplier_code;
  }
});
</script>

<template>
  <div class="px-5 py-4">
    <!-- 主表信息卡片（标题+按钮同行） -->
    <div
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
          />{{ isEdit ? "编辑入库单" : "新增入库单" }}
        </div>
        <div class="flex items-center gap-2">
          <el-button @click="router.back()">取消</el-button>
          <el-button
            v-if="!isEdit || originalStatus === 'draft'"
            type="primary"
            :loading="saving"
            @click="handleSaveDraft"
            >保存草稿</el-button
          >
          <el-button type="success" :loading="saving" @click="handleSubmit">{{
            isEdit && originalStatus !== "draft" ? "保存" : "提交"
          }}</el-button>
        </div>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="单据编号">
              <el-input
                :model-value="form.order_no || '系统自动生成'"
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单据类型">
              <el-select v-model="form.bill_type_code" class="w-full!">
                <el-option
                  v-for="t in billTypes"
                  :key="t"
                  :label="t"
                  :value="t"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="仓库" prop="warehouse_code">
              <QuickAddSelect
                v-model="form.warehouse_code"
                :options="warehouses"
                entity-type="warehouse"
                filterable
                class="w-full!"
                @added="loadWarehouses"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="供应商" prop="supplier_code">
              <QuickAddSelect
                v-model="form.supplier_code"
                :options="supplierOptions"
                entity-type="supplier"
                filterable
                remote
                :remote-method="searchSupplier"
                :loading="supplierLoading"
                :label-key="(s: any) => `${s.supplier_code} ${s.supplier_name}`"
                class="w-full!"
                @added="() => searchSupplier('')"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="入库日期" prop="inbound_date">
              <el-date-picker
                v-model="form.inbound_date"
                type="date"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                class="w-full!"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="车号" prop="vehicle_no">
              <QuickAddSelect
                v-model="form.vehicle_no"
                :options="vehicleOptions"
                entity-type="vehicle"
                filterable
                remote
                :remote-method="searchVehicle"
                :loading="vehicleLoading"
                :label-key="
                  (v: any) => `${v.plate_number} ${v.contact_name || ''}`
                "
                class="w-full!"
                clearable
                @added="() => searchVehicle('')"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="柜号">
              <el-input v-model="form.container_no" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="来货单号">
              <el-input v-model="form.delivery_no" />
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

    <!-- 明细信息卡片 -->
    <div
      class="wms-card"
      :style="{ padding: '20px 24px' }"
    >
      <div class="flex-bc mb-4">
        <div
          class="flex items-center gap-2 text-sm font-semibold"
          :style="{ color: 'var(--el-text-color-primary)' }"
        >
          <span
            class="inline-block w-1 h-4 rounded"
            :style="{ background: 'var(--el-color-primary)' }"
          />明细信息
        </div>
        <el-button type="primary" size="small" @click="addDetail"
          >添加明细</el-button
        >
      </div>
      <el-table border
        :data="details"
        stripe
        row-key="uuid"
        show-summary
        :summary-method="getSummary"
        :header-cell-style="headerCellStyle"
      >
        <el-table-column type="index" label="#" width="50" />
        <el-table-column label="产品编码" width="200">
          <template #default="{ row, $index }">
            <el-select
              v-model="row.product_code"
              filterable
              remote
              :remote-method="(q: string) => searchProduct(q)"
              :loading="productLoading"
              class="w-full!"
              clearable
              @change="(v: string) => onProductChange(v, $index)"
            >
              <el-option
                v-for="p in productOptions"
                :key="p.product_code"
                :label="p.product_code"
                :value="p.product_code"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="product_name" label="产品名称" width="130" show-overflow-tooltip />
        <el-table-column prop="product_model" label="型号" width="130" show-overflow-tooltip />
        <el-table-column label="入库件数" width="130">
          <template #default="{ row }">
            <el-input-number
              v-model="row.inbound_qty"
              :min="0"
              :step="1"
              class="w-full!"
            />
          </template>
        </el-table-column>
        <el-table-column label="入库吨位" width="150">
          <template #default="{ row }">
            <el-input-number
              v-model="row.inbound_weight"
              :min="0"
              :step="0.0001"
              :precision="4"
              class="w-full!"
            />
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="200">
          <template #default="{ row }">
            <el-input v-model="row.detail_remark" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ $index }">
            <el-button
              link
              size="small"
              type="danger"
              :disabled="details.length <= 1"
              @click="removeDetail($index)"
              >删除</el-button
            >
          </template>
        </el-table-column>
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

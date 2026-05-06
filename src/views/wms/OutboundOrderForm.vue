<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { QuickAddSelect } from "@/components/QuickAddSelect";
import api from "@/api/wms";

defineOptions({ name: "OutboundOrderForm" });

const route = useRoute();
const router = useRouter();
const isEdit = computed(() => !!route.params.id);
const originalStatus = ref("");
let _id = 0;
function uid() {
  return "d_" + ++_id + "_" + Date.now();
}

const billTypeOptions = ref<{ label: string; value: string }[]>([]);
const warehouses = ref<any[]>([]);
const customerOptions = ref<any[]>([]);
const customerLoading = ref(false);
const productOptions = ref<any[]>([]);
const productLoading = ref(false);
const vehicleOptions = ref<any[]>([]);
const vehicleLoading = ref(false);
const saving = ref(false);
const formRef = ref();

const form = reactive({
  bill_type_code: "销售出库",
  warehouse_code: "",
  customer_code: "",
  customer_name: "",
  customer_address: "",
  contact_person: "",
  contact_phone: "",
  outbound_date: new Date().toISOString().slice(0, 10),
  vehicle_no: "",
  container_no: "",
  remark: "",
  order_no: "",
  lock_version: 0
});

const rules = {
  warehouse_code: [
    { required: true, message: "请选择仓库", trigger: "change" }
  ],
  customer_code: [{ required: true, message: "请选择客户", trigger: "change" }],
  outbound_date: [
    { required: true, message: "请选择出库日期", trigger: "change" }
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
    contract_no: "大客户协议",
    outbound_qty: null,
    outbound_weight: null,
    detail_remark: "",
    _stockQty: null,
    _stockWeight: null,
    _qtyExceed: false,
    _weightExceed: false
  };
}

const totalQty = computed(() =>
  details.value.reduce((s, d) => s + (Number(d.outbound_qty) || 0), 0)
);
const totalWeight = computed(() =>
  details.value.reduce((s, d) => s + (Number(d.outbound_weight) || 0), 0)
);

function getSummary({ columns }: any) {
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

function addDetail() {
  details.value.push(initDetail());
}
function removeDetail(i: number) {
  details.value.splice(i, 1);
}

async function searchCustomer(keyword?: string) {
  customerLoading.value = true;
  try {
    const res = await api.get("/customer/search", {
      params: { keyword: keyword || undefined, pageSize: 500 }
    });
    customerOptions.value = res.data || [];
  } finally {
    customerLoading.value = false;
  }
}

function onCustomerChange(code: string) {
  const c = customerOptions.value.find((c: any) => c.customer_code === code);
  if (c) {
    form.customer_name = c.customer_name || "";
    form.customer_address = c.address || "";
    form.contact_person = c.contact_person || "";
    form.contact_phone = c.contact_phone || "";
  } else {
    form.customer_name = "";
    form.customer_address = "";
    form.contact_person = "";
    form.contact_phone = "";
  }
}

async function searchProduct(keyword?: string) {
  productLoading.value = true;
  try {
    const res = await api.get("/product/search", {
      params: { keyword: keyword || undefined, pageSize: 500 }
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
      params: { keyword: keyword || undefined, pageSize: 500 }
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
  checkStock(index);
}

function onWarehouseChange() {
  details.value.forEach((_: any, i: number) => checkStock(i));
}

async function checkStock(index: number) {
  const d = details.value[index];
  if (!form.warehouse_code || !d.product_code) {
    d._stockQty = null;
    d._stockWeight = null;
    d._qtyExceed = false;
    d._weightExceed = false;
    return;
  }
  try {
    const res = await api.get("/stock/check", {
      params: {
        warehouse_code: form.warehouse_code,
        product_code: d.product_code
      }
    });
    const stock = res.data;
    const sq = Number(stock.stock_qty) || 0;
    const sw = Number(stock.stock_weight) || 0;
    d._stockQty = sq;
    d._stockWeight = sw;
    d._qtyExceed = (Number(d.outbound_qty) || 0) > sq;
    d._weightExceed = (Number(d.outbound_weight) || 0) > sw;
  } catch {
    d._stockQty = null;
    d._stockWeight = null;
    d._qtyExceed = false;
    d._weightExceed = false;
  }
}

function validateDetails() {
  for (const d of details.value) {
    if (!d.product_code) {
      ElMessage.warning("请为每行选择产品");
      return false;
    }
    if (!d.outbound_qty || d.outbound_qty <= 0) {
      ElMessage.warning("出库件数必须大于0");
      return false;
    }
    if (!d.outbound_weight || d.outbound_weight <= 0) {
      ElMessage.warning("出库吨位必须大于0");
      return false;
    }
  }
  return true;
}

async function handleSaveDraft() {
  await formRef.value?.validate().catch(() => {});
  if (
    !form.warehouse_code ||
    !form.customer_code ||
    !form.outbound_date ||
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
      await api.put(`/outbound/order/${route.params.id}`, payload);
    else await api.post("/outbound/order", payload);
    ElMessage.success("保存成功");
    router.push("/outbound/list");
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
    !form.customer_code ||
    !form.outbound_date ||
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
      await api.put(`/outbound/order/${route.params.id}`, payload);
      ElMessage.success("提交成功");
    } else {
      const res = await api.post("/outbound/order", payload);
      ElMessage.success("提交成功，单号：" + res.data.order_no);
    }
    router.push("/outbound/list");
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "提交失败");
  } finally {
    saving.value = false;
  }
}

async function loadData() {
  const res = await api.get("/outbound/order/" + route.params.id);
  const { order, details: dets } = res.data;
  originalStatus.value = order.order_status || "";
  Object.assign(form, {
    bill_type_code: order.bill_type_code || "销售出库",
    warehouse_code: order.warehouse_code || "",
    customer_code: order.customer_code || "",
    customer_name: order.customer_name || "",
    customer_address: order.customer_address || "",
    contact_person: order.contact_person || "",
    contact_phone: order.contact_phone || "",
    outbound_date: order.outbound_date || "",
    vehicle_no: order.vehicle_no || "",
    container_no: order.container_no || "",
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
          contract_no: d.contract_no || "",
          outbound_qty: Number(d.outbound_qty) || null,
          outbound_weight: Number(d.outbound_weight) || null,
          detail_remark: d.detail_remark || ""
        }))
      : [initDetail()];
  if (order.customer_code) {
    await searchCustomer("");
    if (
      !customerOptions.value.find(
        (c: any) => c.customer_code === order.customer_code
      )
    )
      customerOptions.value.push({
        customer_code: order.customer_code,
        customer_name: order.customer_name || ""
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

async function loadDict() {
  try {
    const res = await api.get("/sys/dict/data/outbound_type");
    billTypeOptions.value = (res.data || []).map((d: any) => ({
      label: d.dict_label,
      value: d.dict_value
    }));
  } catch { /* 字典加载失败使用空数组 */ }
}

onMounted(async () => {
  await loadDict();
  await loadWarehouses();
  await searchCustomer("");
  await searchVehicle("");
  if (isEdit.value) {
    await loadData();
  }
});
</script>

<template>
  <div class="px-5 py-4">
    <!-- 主表信息卡片 -->
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
          />{{ isEdit ? "编辑出库单" : "新增出库单" }}
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
                  v-for="t in billTypeOptions"
                  :key="t.value"
                  :label="t.label"
                  :value="t.value"
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
                @change="onWarehouseChange"
                @added="loadWarehouses"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="出库日期" prop="outbound_date">
              <el-date-picker
                v-model="form.outbound_date"
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
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <!-- 客户信息卡片 -->
    <div
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
      <el-form :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="客户名称" prop="customer_code">
              <el-tooltip :content="form.customer_name" placement="top" :disabled="!form.customer_name">
              <QuickAddSelect
                v-model="form.customer_code"
                :options="customerOptions"
                entity-type="customer"
                filterable
                remote
                :remote-method="searchCustomer"
                :loading="customerLoading"
                :label-key="(c: any) => c.customer_name"
                class="w-full!"
                @change="onCustomerChange"
                @added="() => searchCustomer('')"
              />
              </el-tooltip>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户地址">
              <el-input
                :model-value="form.customer_address"
                disabled
                placeholder="选择客户后自动填充"
                :title="form.customer_address"
              />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="联系人">
              <el-input
                :model-value="form.contact_person"
                disabled
                placeholder="自动填充"
                :title="form.contact_person"
              />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="电话">
              <el-input
                :model-value="form.contact_phone"
                disabled
                placeholder="自动填充"
                :title="form.contact_phone"
              />
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
        <el-table-column label="合同号" width="130">
          <template #default="{ row }">
            <el-input v-model="row.contract_no" clearable />
          </template>
        </el-table-column>
        <el-table-column label="出库件数" width="140">
          <template #default="{ row, $index }">
            <div>
              <el-input-number
                v-model="row.outbound_qty"
                :min="0"
                :step="1"
                class="w-full!"
                @change="() => checkStock($index)"
              />
              <div
                v-if="row._stockQty != null"
                :style="{
                  fontSize: '12px',
                  marginTop: '2px',
                  color: row._qtyExceed ? '#f56c6c' : '#909399'
                }"
              >
                库存：{{ row._stockQty }} 件<template v-if="row._qtyExceed"
                  >（不足）</template
                >
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="出库吨位" width="160">
          <template #default="{ row, $index }">
            <div>
              <el-input-number
                v-model="row.outbound_weight"
                :min="0"
                :step="0.0001"
                :precision="4"
                class="w-full!"
                @change="() => checkStock($index)"
              />
              <div
                v-if="row._stockWeight != null"
                :style="{
                  fontSize: '12px',
                  marginTop: '2px',
                  color: row._weightExceed ? '#f56c6c' : '#909399'
                }"
              >
                库存：{{ Number(row._stockWeight || 0).toFixed(4) }} 吨<template
                  v-if="row._weightExceed"
                  >（不足）</template
                >
              </div>
            </div>
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

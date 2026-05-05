<template>
  <el-dialog
    :model-value="modelValue"
    title="新增客户"
    width="640px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="客户编码">
            <span class="code-text">{{ form.customer_code || '系统自动生成' }}</span>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="客户名称" prop="customer_name">
            <el-input v-model="form.customer_name" placeholder="请输入客户名称" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="地址">
            <el-input v-model="form.address" placeholder="请输入地址" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系人">
            <el-input v-model="form.contact_person" placeholder="请输入联系人" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="电话">
            <el-input v-model="form.contact_phone" placeholder="请输入联系电话" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="信用额度">
            <el-input-number v-model="form.credit_limit" :min="0" :precision="2" controls-position="right" class="w-full!" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="等级">
            <el-select v-model="form.customer_level" class="w-full!">
              <el-option v-for="o in customerLevelOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import api from "@/api/wms";

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: "update:modelValue", v: boolean): void; (e: "saved", record: any): void }>();

const saving = ref(false);
const formRef = ref();
const form = reactive({
  customer_code: "",
  customer_name: "",
  address: "",
  contact_person: "",
  contact_phone: "",
  credit_limit: null as number | null,
  customer_level: "A"
});
const formRules = {
  customer_name: [{ required: true, message: "请输入客户名称", trigger: "blur" }]
};

const customerLevelOptions = ref<any[]>([]);

onMounted(async () => {
  try {
    const res = await api.get("/sys/dict/data/customer_level");
    customerLevelOptions.value = (res.data || []).map((d: any) => ({ label: d.dict_label, value: d.dict_value }));
  } catch { /* empty */ }
});

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const res = await api.post("/customer", { ...form });
    const record = res?.data || res;
    ElMessage.success("客户新增成功");
    emit("update:modelValue", false);
    emit("saved", record);
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "新增失败");
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.el-form-item {
  margin-bottom: 22px;
}
.code-text {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>

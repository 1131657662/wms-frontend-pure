<template>
  <el-dialog
    :model-value="modelValue"
    title="新增供应商"
    width="650px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="编码">
            <span class="code-text">{{ form.supplier_code || '系统自动生成' }}</span>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="名称" prop="supplier_name">
            <el-input v-model="form.supplier_name" placeholder="请输入供应商名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="简称">
            <el-input v-model="form.supplier_short" placeholder="请输入供应商简称" />
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
          <el-form-item label="邮箱">
            <el-input v-model="form.contact_email" placeholder="请输入联系邮箱" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="类型">
            <el-select v-model="form.supplier_type" clearable placeholder="请选择类型" class="w-full!">
              <el-option v-for="o in supplierTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="等级">
            <el-select v-model="form.level" class="w-full!">
              <el-option v-for="o in supplierLevelOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="合作状态">
            <el-select v-model="form.cooperation_status" class="w-full!">
              <el-option v-for="o in cooperationStatusOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="启用">
            <el-switch v-model="form.is_enabled" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注信息" />
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
  supplier_code: "",
  supplier_name: "",
  supplier_short: "",
  contact_person: "",
  contact_phone: "",
  contact_email: "",
  supplier_type: "",
  level: "A",
  cooperation_status: "合作中",
  is_enabled: 1,
  remark: ""
});
const formRules = {
  supplier_name: [{ required: true, message: "请输入供应商名称", trigger: "blur" }]
};

const supplierTypeOptions = ref<any[]>([]);
const supplierLevelOptions = ref<any[]>([]);
const cooperationStatusOptions = ref<any[]>([]);

onMounted(async () => {
  try {
    const [types, levels, statuses] = await Promise.all([
      api.get("/sys/dict/data/supplier_type"),
      api.get("/sys/dict/data/supplier_level"),
      api.get("/sys/dict/data/cooperation_status")
    ]);
    supplierTypeOptions.value = (types.data || []).map((d: any) => ({ label: d.dict_label, value: d.dict_value }));
    supplierLevelOptions.value = (levels.data || []).map((d: any) => ({ label: d.dict_label, value: d.dict_value }));
    cooperationStatusOptions.value = (statuses.data || []).map((d: any) => ({ label: d.dict_label, value: d.dict_value }));
  } catch { /* empty */ }
});

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const res = await api.post("/supplier", { ...form });
    const record = res?.data || res;
    ElMessage.success("供应商新增成功");
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

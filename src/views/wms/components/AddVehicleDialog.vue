<template>
  <el-dialog
    :model-value="modelValue"
    title="新增车辆"
    width="520px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="车牌号" prop="plate_number">
            <el-input v-model="form.plate_number" placeholder="请输入车牌号" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系人">
            <el-input v-model="form.contact_name" placeholder="请输入联系人" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="电话">
            <el-input v-model="form.contact_phone" placeholder="请输入联系电话" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态">
            <el-select v-model="form.status" class="w-full!">
              <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
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
import { ref, reactive } from "vue";
import { ElMessage } from "element-plus";
import api from "@/api/wms";

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: "update:modelValue", v: boolean): void; (e: "saved", record: any): void }>();

const saving = ref(false);
const formRef = ref();
const form = reactive({
  plate_number: "",
  contact_name: "",
  contact_phone: "",
  status: 1,
  remark: ""
});
const formRules = {
  plate_number: [{ required: true, message: "请输入车牌号", trigger: "blur" }]
};

const statusOptions = [
  { label: "可用", value: 1 },
  { label: "维修", value: 2 },
  { label: "停用", value: 3 }
];

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const res = await api.post("/vehicle", { ...form });
    const record = res?.data || res;
    ElMessage.success("车辆新增成功");
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
</style>

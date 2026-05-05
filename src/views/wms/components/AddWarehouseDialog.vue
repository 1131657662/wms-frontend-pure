<template>
  <el-dialog
    :model-value="modelValue"
    title="新增仓库"
    width="640px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="仓库编码">
            <span class="code-text">{{ form.warehouse_code || '系统自动生成' }}</span>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="仓库名称" prop="warehouse_name">
            <el-input v-model="form.warehouse_name" placeholder="请输入仓库名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="管理员">
            <el-input v-model="form.manager" placeholder="请输入管理员姓名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="容量(吨)">
            <el-input-number v-model="form.capacity" :min="0" :precision="2" controls-position="right" class="w-full!" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="位置">
            <el-input v-model="form.location" placeholder="请输入仓库位置" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系电话">
            <el-input v-model="form.contact_phone" placeholder="请输入联系电话" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="类型">
            <el-input v-model="form.warehouse_type" placeholder="例：常温、冷链" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="启用">
            <el-switch v-model="form.is_enabled" :active-value="1" :inactive-value="0" />
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
  warehouse_code: "",
  warehouse_name: "",
  manager: "",
  capacity: null as number | null,
  location: "",
  contact_phone: "",
  warehouse_type: "",
  is_enabled: 1
});
const formRules = {
  warehouse_name: [{ required: true, message: "请输入仓库名称", trigger: "blur" }]
};

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const res = await api.post("/warehouse", { ...form });
    const record = res?.data || res;
    ElMessage.success("仓库新增成功");
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

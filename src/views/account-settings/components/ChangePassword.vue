<script setup lang="ts">
import { reactive, ref } from "vue";
import { type FormInstance, type FormRules } from "element-plus";
import { changePassword } from "@/api/user";
import { message } from "@/utils/message";

defineOptions({
  name: "ChangePassword"
});

const formRef = ref<FormInstance>();

const form = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: ""
});

const validateConfirm = (_rule: any, value: string, callback: Function) => {
  if (value !== form.newPassword) {
    callback(new Error("两次输入的新密码不一致"));
  } else {
    callback();
  }
};

const rules = reactive<FormRules>({
  oldPassword: [
    { required: true, message: "请输入旧密码", trigger: "blur" }
  ],
  newPassword: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    { min: 6, message: "新密码长度不能少于6位", trigger: "blur" }
  ],
  confirmPassword: [
    { required: true, message: "请再次输入新密码", trigger: "blur" },
    { validator: validateConfirm, trigger: "blur" }
  ]
});

const loading = ref(false);

const onSubmit = async (formEl: FormInstance) => {
  const valid = await formEl.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    const res = await changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword
    });
    if (res.code === 200) {
      message("密码修改成功", { type: "success" });
      formRef.value?.resetFields();
    } else {
      message(res.message || "修改失败", { type: "error" });
    }
  } catch (e: any) {
    message(e.response?.data?.message || "修改失败", { type: "error" });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-w-45 max-w-[70%]">
    <h3 class="my-8!">修改密码</h3>
    <el-form
      ref="formRef"
      label-position="top"
      :rules="rules"
      :model="form"
      style="max-width: 400px"
    >
      <el-form-item label="旧密码" prop="oldPassword">
        <el-input
          v-model="form.oldPassword"
          type="password"
          show-password
          placeholder="请输入旧密码"
        />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model="form.newPassword"
          type="password"
          show-password
          placeholder="请输入新密码（至少6位）"
        />
      </el-form-item>
      <el-form-item label="确认新密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          show-password
          placeholder="请再次输入新密码"
        />
      </el-form-item>
      <el-button type="primary" :loading="loading" @click="onSubmit(formRef)">
        修改密码
      </el-button>
    </el-form>
  </div>
</template>

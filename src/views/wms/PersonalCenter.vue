<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import api from "@/api/wms";
import { useUserStoreHook } from "@/store/modules/user";

defineOptions({ name: "PersonalCenter" });

const loading = ref(false);
const saving = ref(false);
const pwdSaving = ref(false);
const avatarUploading = ref(false);
const pwdFormRef = ref();

const form = reactive({
  username: "",
  nickname: "",
  phone: "",
  email: "",
  roleCode: "",
  roleName: ""
});
const pwdForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: ""
});
const avatarUrl = ref("");

const pwdRules = {
  oldPassword: [{ required: true, message: "请输入旧密码", trigger: "blur" }],
  newPassword: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    { min: 6, message: "密码至少6位", trigger: "blur" }
  ],
  confirmPassword: [
    { required: true, message: "请确认新密码", trigger: "blur" },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== pwdForm.newPassword)
          callback(new Error("两次密码不一致"));
        else callback();
      },
      trigger: "blur"
    }
  ]
};

function beforeAvatarUpload(file: File) {
  const isImage = file.type === "image/jpeg" || file.type === "image/png";
  if (!isImage) {
    ElMessage.error("仅支持 JPG/PNG 格式");
    return false;
  }
  if (file.size / 1024 / 1024 > 2) {
    ElMessage.error("图片大小不能超过 2MB");
    return false;
  }
  return true;
}

async function handleAvatarChange(file: any) {
  avatarUploading.value = true;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const res = await api.post("/user/upload-avatar", {
        image: e.target!.result
      });
      avatarUrl.value = res.data.avatar;
      useUserStoreHook().SET_AVATAR(res.data.avatar);
      const info = JSON.parse(localStorage.getItem("user-info") || "{}");
      info.avatar = res.data.avatar;
      localStorage.setItem("user-info", JSON.stringify(info));
      ElMessage.success("头像已更新");
    } catch (err: any) {
      ElMessage.error(err.response?.data?.message || "上传失败");
    } finally {
      avatarUploading.value = false;
    }
  };
  reader.onerror = () => {
    avatarUploading.value = false;
    ElMessage.error("文件读取失败");
  };
  reader.readAsDataURL(file.raw);
}

async function loadProfile() {
  loading.value = true;
  try {
    const res = await api.get("/user/profile");
    Object.assign(form, {
      username: res.data.username,
      nickname: res.data.nickname || "",
      phone: res.data.phone || "",
      email: res.data.email || "",
      roleCode: res.data.roleCode || "",
      roleName: res.data.roleName || ""
    });
    avatarUrl.value = res.data.avatar || "";
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    await api.put("/user/profile", {
      nickname: form.nickname,
      phone: form.phone,
      email: form.email
    });
    ElMessage.success("保存成功");
    const info = JSON.parse(localStorage.getItem("user-info") || "{}");
    info.nickname = form.nickname;
    localStorage.setItem("user-info", JSON.stringify(info));
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function handleChangePassword() {
  const valid = await pwdFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  pwdSaving.value = true;
  try {
    await api.post("/user/change-password", {
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword
    });
    ElMessage.success("密码修改成功，请重新登录");
    Object.assign(pwdForm, {
      oldPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setTimeout(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user-info");
      window.location.href = "/login";
    }, 1500);
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || "修改失败");
  } finally {
    pwdSaving.value = false;
  }
}

onMounted(loadProfile);
</script>

<template>
  <div class="p-4">
    <h1 class="text-xl font-bold mb-4">个人中心</h1>
    <div class="flex gap-5 flex-wrap">
      <el-card shadow="never" class="min-w-100 flex-1">
        <template #header>基本信息</template>
        <div class="mb-5 text-center">
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            accept=".jpg,.jpeg,.png"
            :before-upload="beforeAvatarUpload"
            :on-change="handleAvatarChange"
            class="inline-block"
          >
            <el-avatar
              v-loading="avatarUploading"
              :src="avatarUrl"
              :size="80"
              class="cursor-pointer"
            />
            <div class="mt-2 text-xs text-blue-500 cursor-pointer">
              {{ avatarUploading ? "上传中..." : "点击更换头像" }}
            </div>
            <div class="text-xs text-gray-400">支持 JPG/PNG，不超过 2MB</div>
          </el-upload>
        </div>
        <el-form v-loading="loading" :model="form" label-width="100px">
          <el-form-item label="用户名"
            ><el-input :model-value="form.username" disabled
          /></el-form-item>
          <el-form-item label="昵称"
            ><el-input v-model="form.nickname"
          /></el-form-item>
          <el-form-item label="手机号"
            ><el-input v-model="form.phone"
          /></el-form-item>
          <el-form-item label="邮箱"
            ><el-input v-model="form.email"
          /></el-form-item>
          <el-form-item label="角色"
            ><el-input :model-value="form.roleName || form.roleCode" disabled
          /></el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="handleSave"
              >保存</el-button
            >
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="min-w-100 flex-1">
        <template #header>修改密码</template>
        <el-form
          ref="pwdFormRef"
          :model="pwdForm"
          :rules="pwdRules"
          label-width="100px"
        >
          <el-form-item label="旧密码" prop="oldPassword">
            <el-input
              v-model="pwdForm.oldPassword"
              type="password"
              show-password
            />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input
              v-model="pwdForm.newPassword"
              type="password"
              show-password
            />
          </el-form-item>
          <el-form-item label="确认新密码" prop="confirmPassword">
            <el-input
              v-model="pwdForm.confirmPassword"
              type="password"
              show-password
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :loading="pwdSaving"
              @click="handleChangePassword"
              >修改密码</el-button
            >
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

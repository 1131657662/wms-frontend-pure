<script setup lang="ts">
import { message } from "@/utils/message";
import { onMounted, reactive, ref } from "vue";
import { type UserInfo, getMine } from "@/api/user";
import api from "@/api/wms";
import { useUserStoreHook } from "@/store/modules/user";
import type { FormInstance, FormRules } from "element-plus";
import ReCropperPreview from "@/components/ReCropperPreview";
import { deviceDetection } from "@pureadmin/utils";
import uploadLine from "~icons/ri/upload-line";

defineOptions({
  name: "Profile"
});

const imgSrc = ref("");
const cropperBlob = ref();
const cropRef = ref();
const uploadRef = ref();
const isShow = ref(false);
const userInfoFormRef = ref<FormInstance>();

const userInfos = reactive({
  avatar: "",
  nickname: "",
  email: "",
  phone: "",
  description: "",
  wechat_bound: false
});

const rules = reactive<FormRules<UserInfo>>({
  nickname: [{ required: true, message: "昵称必填", trigger: "blur" }]
});

function queryEmail(queryString, callback) {
  const emailList = [
    { value: "@qq.com" },
    { value: "@126.com" },
    { value: "@163.com" }
  ];
  let results = [];
  let queryList = [];
  emailList.map(item =>
    queryList.push({ value: queryString.split("@")[0] + item.value })
  );
  results = queryString
    ? queryList.filter(
        item =>
          item.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0
      )
    : queryList;
  callback(results);
}

const onChange = uploadFile => {
  const reader = new FileReader();
  reader.onload = e => {
    imgSrc.value = e.target.result as string;
    isShow.value = true;
  };
  reader.readAsDataURL(uploadFile.raw);
};

const handleClose = () => {
  cropRef.value.hidePopover();
  uploadRef.value.clearFiles();
  isShow.value = false;
};

const onCropper = ({ blob }) => (cropperBlob.value = blob);

const handleSubmitImage = async () => {
  try {
    const formData = new FormData();
    formData.append("avatar", cropperBlob.value, "avatar.png");
    const res = await api.post("/user/upload-avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    if (res.code === 200) {
      userInfos.avatar = res.data.avatar;
      useUserStoreHook().SET_AVATAR(res.data.avatar);
      // 同步更新 localStorage，否则重新打开页面（未重新登录）时导航栏显示旧头像
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      userInfo.avatar = res.data.avatar;
      localStorage.setItem("user-info", JSON.stringify(userInfo));
      message("更新头像成功", { type: "success" });
      handleClose();
    } else {
      message(res.message || "更新头像失败");
    }
  } catch (e: any) {
    message(e.response?.data?.message || "上传失败");
  }
};

// 更新信息
const onSubmit = async (formEl: FormInstance) => {
  const valid = await formEl.validate().catch(() => false);
  if (!valid) return;
  try {
    const res = await api.put("/user/profile", {
      nickname: userInfos.nickname,
      email: userInfos.email,
      phone: userInfos.phone,
      description: userInfos.description
    });
    if (res.code === 200) {
      message("更新信息成功", { type: "success" });
    } else {
      message(res.message || "更新失败");
    }
  } catch (e: any) {
    message(e.response?.data?.message || "更新失败");
  }
};

onMounted(async () => {
  const { code, data } = await getMine();
  if (code === 0) {
    Object.assign(userInfos, data);
  }
});
</script>

<template>
  <div :class="['min-w-45', deviceDetection() ? 'max-w-full' : 'max-w-[70%]']">
    <h3 class="my-8!">个人信息</h3>
    <el-form
      ref="userInfoFormRef"
      label-position="top"
      :rules="rules"
      :model="userInfos"
    >
      <el-form-item label="头像">
        <el-avatar :size="80" :src="userInfos.avatar" />
        <el-upload
          ref="uploadRef"
          accept=".jpg,.jpeg,.png"
          action="#"
          :limit="1"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="onChange"
        >
          <el-button plain class="ml-4!">
            <IconifyIconOffline :icon="uploadLine" />
            <span class="ml-2">更新头像</span>
          </el-button>
        </el-upload>
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="userInfos.nickname" placeholder="请输入昵称" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-autocomplete
          v-model="userInfos.email"
          :fetch-suggestions="queryEmail"
          :trigger-on-focus="false"
          placeholder="请输入邮箱"
          clearable
          class="w-full"
        />
      </el-form-item>
      <el-form-item label="联系电话">
        <el-input
          v-model="userInfos.phone"
          placeholder="请输入联系电话"
          clearable
        />
      </el-form-item>
      <el-form-item label="微信小程序">
        <el-tag v-if="userInfos.wechat_bound" type="success" size="small"
          >已绑定</el-tag
        >
        <el-tag v-else type="info" size="small">未绑定</el-tag>
        <span class="ml-3 text-sm" style="color: var(--el-text-color-secondary)"
          >请在微信小程序中完成微信与系统账号绑定</span
        >
      </el-form-item>
      <el-form-item label="简介">
        <el-input
          v-model="userInfos.description"
          placeholder="请输入简介"
          type="textarea"
          :autosize="{ minRows: 6, maxRows: 8 }"
          maxlength="56"
          show-word-limit
        />
      </el-form-item>
      <el-button type="primary" @click="onSubmit(userInfoFormRef)">
        更新信息
      </el-button>
    </el-form>
    <el-dialog
      v-model="isShow"
      width="40%"
      title="编辑头像"
      destroy-on-close
      :closeOnClickModal="false"
      :before-close="handleClose"
      :fullscreen="deviceDetection()"
    >
      <ReCropperPreview ref="cropRef" :imgSrc="imgSrc" @cropper="onCropper" />
      <template #footer>
        <div class="dialog-footer">
          <el-button bg text @click="handleClose">取消</el-button>
          <el-button bg text type="primary" @click="handleSubmitImage">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

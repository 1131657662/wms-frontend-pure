<script setup lang="ts">
import Motion from "./utils/motion";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import { debounce } from "@pureadmin/utils";
import { useEventListener } from "@vueuse/core";
import type { FormInstance } from "element-plus";
import { useUserStoreHook } from "@/store/modules/user";
import { bg, avatar, illustration } from "./utils/static";
import { ref, toRaw } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import dayIcon from "@/assets/svg/day.svg?component";
import darkIcon from "@/assets/svg/dark.svg?component";
import Lock from "~icons/ri/lock-fill";
import User from "~icons/ri/user-3-fill";

defineOptions({
  name: "Login"
});

const router = useRouter();
const loading = ref(false);
const disabled = ref(false);
const ruleFormRef = ref<FormInstance>();

const ruleForm = ref({
  username: "",
  password: ""
});

const loginRules = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }]
};

const onLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  await formEl.validate(valid => {
    if (valid) {
      loading.value = true;
      useUserStoreHook()
        .loginByUsername({
          username: ruleForm.value.username,
          password: ruleForm.value.password
        })
        .then(async () => {
          disabled.value = true;
          router.push("/dashboard/analysis").then(() => {
            message("登录成功", { type: "success" });
          });
        })
        .catch(err => {
          message(err || "登录失败", { type: "error" });
        })
        .finally(() => {
          disabled.value = false;
          loading.value = false;
        });
    }
  });
};

const immediateDebounce: any = debounce(
  formRef => onLogin(formRef),
  1000,
  true
);

useEventListener(document, "keydown", ({ code }) => {
  if (
    ["Enter", "NumpadEnter"].includes(code) &&
    !disabled.value &&
    !loading.value
  )
    immediateDebounce(ruleFormRef.value);
});
</script>

<template>
  <div class="select-none">
    <img :src="bg" class="wave" />
    <div class="login-container">
      <div class="img">
        <component :is="toRaw(illustration)" />
      </div>
      <div class="login-box">
        <div class="login-form">
          <Motion>
            <div class="brand-area">
              <img src="/logo.png" alt="茂智LOGO" class="brand-logo" />
              <h2 class="brand-title">茂智物流</h2>
            </div>
          </Motion>
          <el-form
            ref="ruleFormRef"
            :model="ruleForm"
            :rules="loginRules"
            size="large"
          >
            <Motion :delay="100">
              <el-form-item prop="username">
                <el-input
                  v-model="ruleForm.username"
                  clearable
                  placeholder="用户名"
                  :prefix-icon="useRenderIcon(User)"
                />
              </el-form-item>
            </Motion>
            <Motion :delay="150">
              <el-form-item prop="password">
                <el-input
                  v-model="ruleForm.password"
                  clearable
                  show-password
                  placeholder="密码"
                  :prefix-icon="useRenderIcon(Lock)"
                />
              </el-form-item>
            </Motion>
            <Motion :delay="200">
              <el-form-item>
                <el-button
                  class="w-full mt-4!"
                  size="default"
                  type="primary"
                  :loading="loading"
                  :disabled="disabled"
                  @click="onLogin(ruleFormRef)"
                >
                  登录
                </el-button>
              </el-form-item>
            </Motion>
          </el-form>
        </div>
      </div>
    </div>
    <div class="w-full flex-c absolute bottom-3">
      <div class="beian-info">
        <img src="/beian-icon.png" alt="公安备案图标" class="beian-icon" />
        <a
          href="https://beian.mps.gov.cn/#/query/webSearch?code=33028202001106"
          target="_blank"
          rel="noreferrer"
          class="beian-link"
          >浙公网安备33028202001106号</a
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url("@/style/login.css");
</style>

<style lang="scss" scoped>
:deep(.el-input-group__append, .el-input-group__prepend) {
  padding: 0;
}

.brand-area {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 36px;
}

.brand-logo {
  display: block;
  width: 50px;
  height: auto;
  margin-right: 14px;
}

.login-form .brand-title {
  margin: 0;
  font-family: var(--el-font-family);
  font-size: 32px;
  font-weight: 600;
  line-height: 1.2;
  color: #ea5413;
  text-transform: none;

  .dark & {
    color: #ff7a45;
  }
}

.beian-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.beian-icon {
  width: 14px;
  height: 14px;
  margin-right: 4px;
  vertical-align: middle;
}

.beian-link {
  font-size: 14px;
  color: #909399;
  text-decoration: none;

  &:hover {
    color: #909399;
    text-decoration: none;
  }
}
</style>

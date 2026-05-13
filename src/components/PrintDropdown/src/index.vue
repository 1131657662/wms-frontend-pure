<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import { responseList } from "@/utils/responseList";

import Printer from "~icons/ep/printer";
import ArrowDown from "~icons/ep/arrow-down";

defineOptions({ name: "PrintDropdown" });

const props = withDefaults(
  defineProps<{
    pageCode: string;
    businessId: string;
    disabled?: boolean;
  }>(),
  {
    disabled: false
  }
);

const templates = ref<any[]>([]);
const printing = ref(false);

onMounted(async () => {
  if (!props.pageCode) return;
  try {
    const res = await api.get(`/print/template/by-page/${props.pageCode}`);
    templates.value = responseList(res.data);
  } catch {
    /* 获取模板列表失败，下拉为空 */
  }
});

async function handlePrint(tmpl: any) {
  printing.value = true;
  try {
    // 后端返回 JSON：{ code, data: { url, fileName } }，由 Node 拉积木并落盘到 /public/temp/print/
    const res = (await api.post(
      `/print/${tmpl.id}/${props.businessId}`,
      {}
    )) as {
      code?: number;
      message?: string;
      data?: { url?: string; fileName?: string };
    };
    const pdfUrl = res?.data?.url;
    if (!pdfUrl) {
      ElMessage.error(res?.message || "打印失败，未返回文件地址");
      return;
    }
    const openUrl = pdfUrl.startsWith("http")
      ? pdfUrl
      : `${window.location.origin}${pdfUrl}`;
    window.open(openUrl, "_blank");
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "打印失败");
  } finally {
    printing.value = false;
  }
}
</script>

<template>
  <el-tooltip
    v-if="templates.length > 0"
    :disabled="!disabled"
    content="请仅勾选一条单据再打印"
    placement="top"
  >
    <el-dropdown trigger="click" :disabled="disabled || printing">
      <el-button
        plain
        :disabled="disabled"
        :loading="printing"
        :icon="useRenderIcon(Printer)"
      >
        打印<el-icon class="ml-1"
          ><component :is="useRenderIcon(ArrowDown)"
        /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="tmpl in templates"
            :key="tmpl.id"
            @click="handlePrint(tmpl)"
          >
            {{ tmpl.template_name }}
            <span
              class="text-xs"
              style="color: var(--el-text-color-placeholder)"
            >
              ({{ tmpl.output_format || "PDF" }})
            </span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-tooltip>
</template>

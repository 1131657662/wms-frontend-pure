<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { noticesData } from "./data";
import NoticeList from "./components/NoticeList.vue";
import api from "@/api/wms";
import { responseList } from "@/utils/responseList";

import BellIcon from "~icons/lucide/bell";
import ArrowRightIcon from "~icons/ri/arrow-right-s-line";

const { t } = useI18n();
const router = useRouter();
const dropdownRef = ref();
const notices = ref(noticesData);
const activeKey = ref(noticesData[0]?.key);

let pollTimer: ReturnType<typeof setInterval> | null = null;

function formatTime(v: string) {
  if (!v) return "";
  return new Date(v)
    .toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
    .replace(/\//g, "-");
}

async function fetchNotices() {
  try {
    const res = await api.get("/message/list", { params: { pageSize: 5 } });
    const list = responseList(res.data).map((m: any) => ({
      avatar: m.avatar || "",
      title: m.title || m.type || "消息",
      datetime: formatTime(m.create_time),
      type: String(m.id || ""),
      description: m.content || m.message || "",
      status: m.is_read ? ("info" as const) : ("primary" as const),
      msgType: m.type // 保留原始消息类型用于分流
    }));
    // 通知 tab：公告 + 预警类
    const notifyTypes = [
      "announcement",
      "alert_low",
      "alert_high",
      "alert_normal"
    ];
    notices.value[0].list = list
      .filter((m: any) => notifyTypes.includes(m.msgType))
      .slice(0, 5);
    // 消息 tab：订单流程类（待审核 / 审核通过）
    const msgTypes = ["order_submit", "order_audit"];
    notices.value[1].list = list
      .filter((m: any) => msgTypes.includes(m.msgType))
      .slice(0, 5);
  } catch {
    /* 静默失败 */
  }
}

onMounted(() => {
  fetchNotices();
  pollTimer = setInterval(fetchNotices, 60000);
  window.addEventListener("unread-count-change", fetchNotices);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
  window.removeEventListener("unread-count-change", fetchNotices);
});

const unreadCount = (tab: any) =>
  tab.list.filter((m: any) => m.status === "primary").length;
const getLabel = computed(() => item => {
  const n = unreadCount(item);
  return t(item.name) + (n > 0 ? `(${n})` : "");
});

const hasUnread = computed(() => {
  return notices.value.some(
    tab =>
      Array.isArray(tab.list) &&
      tab.list.some((m: any) => m.status === "primary")
  );
});

const currentNoticeHasData = computed(() => {
  // 始终基于通知 tab（未读消息），避免切到消息 tab 后按钮消失
  return hasUnread.value;
});

const onWatchMore = () => {
  dropdownRef.value.handleClose();
  router.push("/message/center");
};

const onMarkAsRead = async () => {
  try {
    await api.put("/message/read-all");
    notices.value.forEach(tab => (tab.list = []));
    window.dispatchEvent(new CustomEvent("unread-count-change"));
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "操作失败");
  }
};
</script>

<template>
  <el-dropdown
    ref="dropdownRef"
    trigger="click"
    placement="bottom-end"
    popper-class="is-pure-notice"
  >
    <span
      :class="['dropdown-badge', 'navbar-bg-hover', 'select-none', 'mr-1.75']"
    >
      <el-badge is-dot :hidden="!hasUnread">
        <span class="header-notice-icon">
          <IconifyIconOffline :icon="BellIcon" />
        </span>
      </el-badge>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-tabs
          v-model="activeKey"
          :stretch="true"
          class="dropdown-tabs"
          :style="{ width: notices.length === 0 ? '200px' : '330px' }"
        >
          <el-empty
            v-if="notices.length === 0"
            :description="t('status.pureNoMessage')"
            :image-size="60"
          />
          <span v-else>
            <template v-for="item in notices" :key="item.key">
              <el-tab-pane :label="getLabel(item)" :name="`${item.key}`">
                <el-scrollbar max-height="345px">
                  <div class="noticeList-container">
                    <NoticeList :list="item.list" :emptyText="item.emptyText" />
                  </div>
                </el-scrollbar>
              </el-tab-pane>
            </template>
          </span>
        </el-tabs>
        <div
          v-if="currentNoticeHasData"
          class="border-t border-t-(--el-border-color-light) text-sm"
        >
          <div class="flex-bc m-1">
            <el-button type="primary" size="small" text @click="onWatchMore">
              {{ t("buttons.pureWatchMore") }}
              <IconifyIconOffline :icon="ArrowRightIcon" />
            </el-button>
            <el-button type="primary" size="small" text @click="onMarkAsRead">
              {{ t("buttons.pureMarkAsRead") }}
            </el-button>
          </div>
        </div>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss" scoped>
/* ”铃铛“摇晃衰减动画 */
@keyframes pure-bell-ring {
  0%,
  100% {
    transform-origin: top;
  }

  15% {
    transform: rotateZ(10deg);
  }

  30% {
    transform: rotateZ(-10deg);
  }

  45% {
    transform: rotateZ(5deg);
  }

  60% {
    transform: rotateZ(-5deg);
  }

  75% {
    transform: rotateZ(2deg);
  }
}

.dropdown-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 48px;
  cursor: pointer;

  .header-notice-icon {
    font-size: 16px;
  }

  &:hover {
    .header-notice-icon svg {
      animation: pure-bell-ring 1s both;
    }
  }
}

.dropdown-tabs {
  .noticeList-container {
    padding: 15px 24px 0;
  }

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap)::after {
    height: 1px;
  }

  :deep(.el-tabs__nav-wrap) {
    padding: 0 36px;
  }
}
</style>

<style>
.el-dropdown__popper.is-pure-notice {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow);
}
</style>

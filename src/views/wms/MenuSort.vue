<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import draggable from "vuedraggable/src/vuedraggable";
import api from "@/api/wms";
import { responseList } from "@/utils/responseList";
import { usePermissionStoreHook } from "@/store/modules/permission";
import {
  saveMenuOrderToStorage,
  applyMenuOrderToRoutes
} from "@/utils/menuOrder";

import Menu from "~icons/ri/menu-line";
import FileList from "~icons/ri/file-list-3-line";
import EditPen from "~icons/ep/edit-pen";

defineOptions({ name: "MenuSort" });

interface MenuItem {
  code: string;
  label: string;
  route: string;
  menu_code: string;
  sort_order: number;
  children: MenuItem[];
}

const menuGroups = ref<MenuItem[]>([]);
const saving = ref(false);
const loading = ref(true);
const errorMsg = ref("");
const dirty = ref(false);

const menuDefs: Record<string, any> = {
  dashboard: { label: "首页" },
  "/dashboard/analysis": { label: "分析页" },
  "/dashboard/workplace": { label: "工作台" },
  report: { label: "统计报表" },
  "/report/monthly-summary": { label: "月度出入库汇总" },
  "/report/turnover": { label: "商品周转率统计" },
  "/report/inbound-detail": { label: "入库明细报表" },
  "/report/outbound-detail": { label: "出库明细报表" },
  "/report/stock-journal": { label: "进销存台账" },
  "/report/period-summary": { label: "收发存汇总表" },
  "/report/stock-aging": { label: "库龄分析报表" },
  base: { label: "基础资料" },
  "/product-category": { label: "商品分类" },
  "/product": { label: "商品管理" },
  "/warehouse": { label: "仓库管理" },
  "/supplier": { label: "供应商管理" },
  "/customer": { label: "客户管理" },
  "/vehicle": { label: "车辆管理" },
  inbound: { label: "入库管理" },
  "/inbound/list": { label: "入库单列表" },
  outbound: { label: "出库管理" },
  "/outbound/list": { label: "出库单列表" },
  "stock-check": { label: "盘点管理" },
  "/stock-check/list": { label: "盘点单列表" },
  stock: { label: "库存管理" },
  "/stock/list": { label: "库存查询" },
  auth: { label: "权限管理" },
  "/auth/user": { label: "用户管理" },
  "/auth/role": { label: "角色管理" },
  "/auth/menu-sort": { label: "菜单排序" },
  settings: { label: "系统配置" },
  "/settings/dict": { label: "数据字典" },
  "/settings/param": { label: "系统参数" },
  "/settings/bill": { label: "单据编号配置" },
  "/settings/print": { label: "打印设置" },
  "/settings/backup": { label: "数据备份" },
  monitor: { label: "系统监控" },
  "/monitor/log": { label: "日志管理" },
  "/monitor/online": { label: "在线用户" },
  "/monitor/task": { label: "定时任务" },
  "/monitor/health": { label: "健康监控" },
  message: { label: "消息中心" },
  "/message/center": { label: "消息列表" }
};

// ==================== 统计 ====================
const stats = computed(() => ({
  groups: menuGroups.value.length,
  items: menuGroups.value.reduce((sum, g) => sum + g.children.length, 0),
  dirty: dirty.value
}));

function onDragEnd() {
  dirty.value = true;
}

async function fetchData() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const res = await api.get("/system/menu/list");
    const rows = responseList(res.data);
    const tops = rows
      .filter((r: any) => !r.parent_code)
      .sort((a: any, b: any) => a.sort_order - b.sort_order);
    menuGroups.value = tops.map((t: any) => {
      const def = menuDefs[t.menu_code] || {};
      const children = rows
        .filter((r: any) => r.parent_code === t.menu_code)
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((c: any) => ({
          ...c,
          code: c.menu_code,
          label: (menuDefs[c.menu_code] || {}).label || c.menu_code,
          route: c.menu_code
        }));
      return {
        ...t,
        code: t.menu_code,
        label: def.label || t.menu_code,
        route: t.menu_code,
        children
      };
    });
    dirty.value = false;
  } catch (e: any) {
    errorMsg.value =
      e.response?.data?.message || e.message || "获取菜单排序失败";
  } finally {
    loading.value = false;
  }
}

async function saveSort() {
  saving.value = true;
  try {
    const items: { menu_code: string; sort_order: number }[] = [];
    menuGroups.value.forEach((g, gi) => {
      items.push({ menu_code: g.menu_code, sort_order: gi + 1 });
      g.children.forEach((c: any, ci: number) => {
        items.push({ menu_code: c.menu_code, sort_order: ci + 1 });
      });
    });
    await api.post("/system/menu/sort", { items });
    saveMenuOrderToStorage(items);
    applyMenuOrderToRoutes();
    usePermissionStoreHook().handleWholeMenus([]);
    ElMessage.success("保存成功，侧边栏已即时更新");
    dirty.value = false;
    window.dispatchEvent(new CustomEvent("menu-order-changed"));
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          {
            label: '菜单分组',
            value: stats.groups,
            color: 'var(--el-color-primary)',
            icon: Menu
          },
          {
            label: '子菜单',
            value: stats.items,
            color: '#67c23a',
            icon: FileList
          },
          {
            label: '状态',
            value: stats.dirty ? '有修改' : '已同步',
            color: stats.dirty ? '#e6a23c' : 'var(--el-color-info)',
            icon: EditPen
          }
        ]"
        :key="card.label"
        class="wms-card flex-1 flex items-center gap-3"
        :style="{ padding: '16px 20px' }"
      >
        <div
          class="flex-c rounded-lg"
          :style="{
            width: '40px',
            height: '40px',
            background: card.color + '15',
            color: card.color
          }"
        >
          <el-icon :size="20"
            ><component :is="useRenderIcon(card.icon)"
          /></el-icon>
        </div>
        <div>
          <div
            class="text-xs"
            :style="{ color: 'var(--el-text-color-secondary)' }"
          >
            {{ card.label }}
          </div>
          <div
            class="text-xl font-semibold"
            :style="{ color: 'var(--el-text-color-primary)' }"
          >
            {{ card.value }}
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 操作栏 ==================== -->
    <div class="wms-card mb-4">
      <div class="flex-bc flex-wrap gap-2" :style="{ padding: '14px 20px' }">
        <div class="flex items-center gap-2">
          <span
            class="inline-block w-1 h-4 rounded"
            :style="{ background: 'var(--el-color-primary)' }"
          />
          <span
            class="text-sm font-semibold"
            :style="{ color: 'var(--el-text-color-primary)' }"
            >菜单排序</span
          >
          <el-tag v-if="dirty" type="warning" size="small" effect="plain"
            >有未保存的修改</el-tag
          >
        </div>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="loading || !dirty"
          @click="saveSort"
          >保存排序</el-button
        >
      </div>
      <div :style="{ padding: '0 20px 12px' }">
        <p class="text-xs" :style="{ color: 'var(--el-text-color-secondary)' }">
          拖拽左侧手柄调整菜单分组及子菜单的顺序，完成后点击保存排序生效
        </p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="wms-card flex-c py-32">
      <div class="text-center">
        <el-icon class="is-loading" :size="28" color="var(--el-color-primary)">
          <svg
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
          >
            <path
              d="M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32zm0 640a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V736a32 32 0 0 1 32-32zm448-192a32 32 0 0 1-32 32H736a32 32 0 0 1 0-64h192a32 32 0 0 1 32 32zm-640 0a32 32 0 0 1-32 32H96a32 32 0 0 1 0-64h192a32 32 0 0 1 32 32z"
            />
          </svg>
        </el-icon>
        <p class="text-gray-400 mt-3">加载菜单排序数据...</p>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="errorMsg" class="wms-card flex-c py-32">
      <div class="text-center">
        <p class="text-red-500 mb-3">{{ errorMsg }}</p>
        <el-button type="primary" @click="fetchData">重新加载</el-button>
      </div>
    </div>

    <!-- 菜单分组列表（可拖拽） -->
    <draggable
      v-else
      v-model="menuGroups"
      item-key="code"
      handle=".group-handle"
      ghost-class="sortable-ghost"
      chosen-class="sortable-chosen"
      :animation="200"
      @end="onDragEnd"
    >
      <template #item="{ element: group, index: gi }">
        <div
          class="menu-group-card mb-3 rounded overflow-hidden"
          :style="{
            background: 'var(--el-bg-color)',
            boxShadow: 'var(--el-box-shadow-lighter)',
            border: '1px solid var(--el-border-color-lighter)'
          }"
        >
          <!-- 分组标题行 -->
          <div
            class="flex items-center gap-3 px-4 py-3"
            :style="{ background: 'var(--el-fill-color-light)' }"
          >
            <iconify-icon-online
              icon="icon-park-outline:drag"
              class="group-handle shrink-0"
              :style="{
                color: 'var(--el-text-color-secondary)',
                cursor: 'grab',
                fontSize: '18px'
              }"
            />
            <span
              class="inline-block w-1 h-4 rounded shrink-0"
              style="background: var(--el-color-primary)"
            />
            <span class="text-sm font-semibold flex-1"
              >{{ gi + 1 }}. {{ group.label }}</span
            >
            <el-tag size="small" effect="plain" type="info"
              >{{ group.children.length }} 个子菜单</el-tag
            >
          </div>

          <!-- 子菜单列表（可拖拽） -->
          <draggable
            v-if="group.children.length > 0"
            v-model="group.children"
            item-key="code"
            handle=".child-handle"
            ghost-class="sortable-ghost"
            chosen-class="sortable-chosen"
            :animation="200"
            @end="onDragEnd"
          >
            <template #item="{ element: child, index: ci }">
              <div
                class="menu-child-row flex items-center gap-3 px-4 py-2.5 border-t transition-colors"
                :class="ci % 2 === 0 ? 'row-even' : 'row-odd'"
                :style="{ borderColor: 'var(--el-border-color-lighter)' }"
              >
                <iconify-icon-online
                  icon="icon-park-outline:drag"
                  class="child-handle shrink-0 ml-5"
                  :style="{
                    color: 'var(--el-text-color-placeholder)',
                    cursor: 'grab',
                    fontSize: '16px'
                  }"
                />
                <span class="text-sm flex-1">{{ child.label }}</span>
                <span
                  class="text-xs px-2 py-0.5 rounded"
                  :style="{
                    background: 'var(--el-fill-color)',
                    color: 'var(--el-text-color-secondary)',
                    fontFamily: 'monospace'
                  }"
                >
                  {{ child.route || child.menu_code }}
                </span>
              </div>
            </template>
          </draggable>
          <div
            v-else
            class="px-4 py-6 text-center text-sm border-t"
            :style="{
              color: 'var(--el-text-color-placeholder)',
              borderColor: 'var(--el-border-color-lighter)'
            }"
          >
            该分组暂无子菜单
          </div>
        </div>
      </template>
    </draggable>

    <!-- 底部保存按钮 -->
    <div v-if="!loading && !errorMsg && dirty" class="mt-4 flex justify-center">
      <el-button type="primary" :loading="saving" size="large" @click="saveSort"
        >保存排序</el-button
      >
    </div>
  </div>
</template>

<style scoped>
.sortable-ghost {
  background: var(--el-color-primary-light-9) !important;
  opacity: 0.3;
}

.sortable-chosen {
  background: var(--el-color-primary-light-9) !important;
  border-color: var(--el-color-primary) !important;
}

.menu-group-card {
  transition: box-shadow 0.3s;
}

.menu-group-card:hover {
  box-shadow: var(--el-box-shadow) !important;
}

.menu-child-row.row-even {
  background: transparent;
}

.menu-child-row.row-odd {
  background: var(--el-fill-color-lighter);
}

.menu-child-row:hover {
  background: var(--el-fill-color-light) !important;
}
</style>

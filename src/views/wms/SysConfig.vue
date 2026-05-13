<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";
import { responseList } from "@/utils/responseList";

import Setting from "~icons/ri/settings-3-line";
import Folder from "~icons/ri/folder-3-line";
import EditPen from "~icons/ep/edit-pen";
import Select from "~icons/ep/select";
import RefreshRight from "~icons/ep/refresh-right";

defineOptions({ name: "SysConfig" });

const list = ref<any[]>([]);
const groups = ref<string[]>([]);
const filterGroup = ref("");
const searchKeyword = ref("");
const loading = ref(false);
const saving = ref(false);
const modifiedIds = reactive(new Set<number>());
const originalValues = ref<Record<number, any>>({});

const headerCellStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)",
  fontWeight: 600,
  fontSize: "13px"
};

const numberKeys = [
  "alert_low_default",
  "alert_high_default",
  "session_timeout",
  "max_export_rows",
  "poll_interval"
];
const floatKeys = ["alert_low_default", "alert_high_default"];

// ==================== 统计 ====================
const filteredList = computed(() => {
  let result = list.value;
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase();
    result = result.filter(
      (item: any) =>
        item.config_name?.toLowerCase().includes(kw) ||
        item.config_key?.toLowerCase().includes(kw)
    );
  }
  return result;
});

const stats = computed(() => ({
  total: filteredList.value.length,
  groups: [...new Set(filteredList.value.map((item: any) => item.config_group))]
    .length,
  modified: modifiedIds.size
}));

// ==================== 列定义 ====================
const columns: any[] = [
  { type: "index", label: "#", width: 56 },
  { label: "参数名称", prop: "config_name", width: 180 },
  {
    label: "参数键",
    prop: "config_key",
    width: 220,
    showOverflowTooltip: true
  },
  { label: "参数值", slot: "config_value", minWidth: 300 },
  { label: "分组", slot: "config_group", width: 120 },
  { label: "备注", prop: "remark", minWidth: 200, showOverflowTooltip: true }
];

// ==================== 值类型判断 ====================
function isNumber(key: string) {
  return numberKeys.includes(key);
}
function isFloat(key: string) {
  return floatKeys.includes(key);
}
function isBoolean(key: string) {
  return key === "enable_register" || key === "enable_captcha";
}

// ==================== 变更追踪 ====================
function markChanged(row: any) {
  const orig = originalValues.value[row.id];
  const current = String(row.config_value);
  if (orig !== undefined && current !== orig) {
    modifiedIds.add(row.id);
  } else if (orig !== undefined && current === orig) {
    modifiedIds.delete(row.id);
  }
}

function onInputChange(row: any) {
  markChanged(row);
}

// ==================== 数据请求 ====================
async function fetchData() {
  loading.value = true;
  try {
    const params: any = {};
    if (filterGroup.value) params.group = filterGroup.value;
    const res = await api.get("/sys/config/list", { params });
    list.value = responseList(res.data);
    // 数值型参数后端返回字符串，转为数字以匹配 el-input-number
    for (const item of list.value) {
      if (isNumber(item.config_key)) {
        item.config_value = Number(item.config_value);
      }
    }
    // 记录原始值
    originalValues.value = {};
    for (const item of list.value) {
      originalValues.value[item.id] = String(item.config_value);
    }
    modifiedIds.clear();
  } finally {
    loading.value = false;
  }
}

async function fetchGroups() {
  const res = await api.get("/sys/config/groups");
  groups.value = responseList<string>(res.data);
}

// ==================== 操作 ====================
const handleSearch = () => {
  fetchData();
};
const handleReset = () => {
  filterGroup.value = "";
  searchKeyword.value = "";
  fetchData();
};

async function saveAll() {
  if (modifiedIds.size === 0) {
    ElMessage.info("没有需要保存的修改");
    return;
  }
  saving.value = true;
  try {
    let saved = 0;
    for (const item of list.value) {
      if (modifiedIds.has(item.id)) {
        await api.put("/sys/config/update", {
          id: item.id,
          config_value: String(item.config_value)
        });
        saved++;
      }
    }
    ElMessage.success(`已保存 ${saved} 项参数`);
    fetchData();
  } finally {
    saving.value = false;
  }
}

function undoChanges() {
  for (const item of list.value) {
    const orig = originalValues.value[item.id];
    if (orig !== undefined) {
      item.config_value = isNumber(item.config_key) ? Number(orig) : orig;
    }
  }
  modifiedIds.clear();
  ElMessage.success("已撤销所有修改");
}

onMounted(() => {
  fetchData();
  fetchGroups();
});
</script>

<template>
  <div class="px-5 py-4">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in [
          {
            label: '参数总数',
            value: stats.total,
            color: 'var(--el-color-primary)',
            icon: Setting
          },
          {
            label: '参数分组',
            value: stats.groups,
            color: '#67c23a',
            icon: Folder
          },
          {
            label: '已修改项',
            value: stats.modified,
            color: stats.modified > 0 ? '#e6a23c' : 'var(--el-color-info)',
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

    <!-- ==================== 操作卡片 ==================== -->
    <div class="wms-card mb-4">
      <!-- 搜索栏 -->
      <div :style="{ padding: '16px 20px' }">
        <div class="flex items-center gap-3 flex-wrap">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索参数名称、参数键..."
            clearable
            :prefix-icon="useRenderIcon(EditPen)"
            class="search-input"
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
          <el-select
            v-model="filterGroup"
            clearable
            placeholder="参数分组"
            class="w-40!"
            @change="handleSearch"
          >
            <el-option v-for="g in groups" :key="g" :label="g" :value="g" />
          </el-select>
          <el-divider direction="vertical" />
          <el-button
            type="primary"
            :icon="useRenderIcon(Select)"
            :loading="loading"
            @click="handleSearch"
            >查询</el-button
          >
          <el-button @click="handleReset">重置</el-button>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div
        class="flex items-center gap-2 flex-wrap"
        :style="{
          padding: '12px 20px',
          borderTop: '1px solid var(--el-border-color-lighter)'
        }"
      >
        <el-button
          type="primary"
          :icon="useRenderIcon(Select)"
          :loading="saving"
          :disabled="modifiedIds.size === 0"
          @click="saveAll"
        >
          保存全部
        </el-button>
        <el-button
          v-if="modifiedIds.size > 0"
          :icon="useRenderIcon(RefreshRight)"
          @click="undoChanges"
        >
          撤销修改
        </el-button>
        <el-alert
          v-if="modifiedIds.size > 0"
          type="warning"
          :closable="false"
          show-icon
          class="flex-1!"
          style="padding: 4px 10px"
        >
          <template #title>
            <span class="text-xs"
              >{{ modifiedIds.size }} 项参数已修改，请点击"保存全部"生效</span
            >
          </template>
        </el-alert>
        <div class="flex-1" />
        <span
          class="text-xs"
          :style="{ color: 'var(--el-text-color-secondary)' }"
        >
          共
          <strong :style="{ color: 'var(--el-text-color-primary)' }">{{
            stats.total
          }}</strong>
          项参数
        </span>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <PureTableBar
      title="系统参数配置"
      :columns="columns"
      storage-key="SysConfig"
      @refresh="fetchData"
    >
      <template
        v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }"
      >
        <pure-table
          :key="tableRefreshKey"
          row-key="id"
          border
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="left"
          :loading="loading"
          :size="size"
          :data="filteredList"
          :columns="dynamicColumns"
          :header-cell-style="headerCellStyle"
          :row-class-name="
            ({ row }: any) => (modifiedIds.has(row.id) ? 'row-modified' : '')
          "
          @header-dragend="
            (newWidth, _oldWidth, col) =>
              onColumnResize(col.label || col.property, newWidth)
          "
        >
          <template #empty>
            <EmptyState
              title="暂无系统参数"
              description="调整筛选条件或刷新重试"
            />
          </template>

          <template #config_group="{ row }">
            <el-tag
              effect="plain"
              size="small"
              :type="
                row.config_group === '库存预警'
                  ? 'warning'
                  : row.config_group === '用户管理'
                    ? 'primary'
                    : 'info'
              "
            >
              {{ row.config_group }}
            </el-tag>
          </template>

          <template #config_value="{ row }">
            <template v-if="row.config_key === 'default_password'">
              <el-input
                v-model="row.config_value"
                show-password
                type="password"
                size="small"
                @input="onInputChange(row)"
              />
            </template>
            <template v-else-if="isNumber(row.config_key)">
              <el-input-number
                v-model="row.config_value"
                :precision="isFloat(row.config_key) ? 3 : 0"
                :min="0"
                size="small"
                class="w-full!"
                @change="onInputChange(row)"
              />
            </template>
            <template v-else-if="isBoolean(row.config_key)">
              <el-switch
                v-model="row.config_value"
                active-value="1"
                inactive-value="0"
                size="small"
                @change="onInputChange(row)"
              />
            </template>
            <template v-else>
              <el-input
                v-model="row.config_value"
                size="small"
                @input="onInputChange(row)"
              />
            </template>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style scoped>
/* 搜索输入 */
.search-input {
  flex: 1;
  min-width: 260px;
}

.search-input :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-input-border-color, var(--el-border-color))
    inset;
}

/* 修改行背景 */
:deep(.row-modified > td) {
  background-color: rgb(230 162 60 / 6%) !important;
}

:deep(.row-modified:hover > td) {
  background-color: rgb(230 162 60 / 10%) !important;
}

/* 表格行高与hover */
:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}

:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}
</style>

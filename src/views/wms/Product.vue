<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import api from "@/api/wms";

import Search from "~icons/ep/search";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";
import Upload from "~icons/ep/upload";
import Plus from "~icons/ep/plus";
import EditPen from "~icons/ep/edit-pen";
import Delete from "~icons/ep/delete";

import ShoppingBag3Line from "~icons/ri/shopping-bag-3-line";
import CheckboxCircleLine from "~icons/ri/checkbox-circle-line";
import Box from "~icons/ep/box";

defineOptions({ name: "Product" });

const searchForm = reactive({ keyword: "" });
const dataList = ref([]);
const loading = ref(false);
const exporting = ref(false);
const pagination = reactive({
  total: 0,
  pageSize: Number(localStorage.getItem("page-size-Product")) || 20,
  currentPage: 1,
  background: true
});
const categoryTree = ref<any[]>([]);
const categoryMap = ref<Record<number, any>>({});

const statsCards = computed(() => [
  { label: "商品总数", value: pagination.total, color: "var(--el-color-primary)", icon: ShoppingBag3Line },
  { label: "启用", value: dataList.value.filter((item: any) => item.status === "正常").length, color: "#67c23a", icon: CheckboxCircleLine },
  { label: "本页", value: dataList.value.length, color: "var(--el-color-info)", icon: Box }
]);

const columns: any[] = [
  { type: "index", label: "#", width: 50, align: "center", fixed: "left" },
  { label: "产品编码", prop: "product_code", width: 130, align: "left" },
  { label: "产品名称", prop: "product_name", minWidth: 150, align: "left" },
  { label: "型号", prop: "product_model", minWidth: 140, align: "left" },
  { label: "计数单位", prop: "count_unit", width: 90, align: "center" },
  { label: "计重单位", prop: "weight_unit", width: 90, align: "center" },
  { label: "包装类型", prop: "package_type", width: 100, align: "center" },
  { label: "包装颜色", prop: "package_color", width: 100, align: "center" },
  { label: "包带颜色", prop: "strap_color", width: 100, align: "center" },
  {
    label: "销售参考价",
    prop: "sale_price",
    slot: "sale_price",
    width: 120,
    align: "right"
  },
  {
    label: "最近成本",
    prop: "cost_price",
    slot: "cost_price",
    width: 110,
    align: "right"
  },
  { label: "状态", prop: "status", slot: "status", width: 80, align: "center" },
  {
    label: "备注",
    prop: "remark",
    minWidth: 180,
    align: "left",
    showOverflowTooltip: true
  },
  {
    label: "操作",
    slot: "operation",
    width: 150,
    align: "center",
    fixed: "right"
  }
];

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.get("/product/list", {
      params: {
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        keyword: searchForm.keyword || undefined
      }
    });
    dataList.value = res.data.list;
    pagination.total = res.data.total;
  } finally {
    loading.value = false;
  }
}

const onSearch = () => {
  pagination.currentPage = 1;
  fetchData();
};
const resetForm = () => {
  searchForm.keyword = "";
  pagination.currentPage = 1;
  fetchData();
};
const handleSizeChange = (v: number) => {
    localStorage.setItem("page-size-Product", String(v));
  pagination.pageSize = v;
  fetchData();
};
const handleCurrentChange = (v: number) => {
  pagination.currentPage = v;
  fetchData();
};

const hasAnyFilter = computed(() => !!searchForm.keyword);
const exportFileName = computed(() => {
  const p = ["商品数据"];
  if (searchForm.keyword) p.push(searchForm.keyword);
  return p.join("_") + ".xlsx";
});

async function handleExport() {
  if (!hasAnyFilter.value) {
    ElMessage.warning("为保证系统性能，请先设置筛选条件后再导出！");
    return;
  }
  exporting.value = true;
  try {
    const params: any = {};
    if (searchForm.keyword) params.keyword = searchForm.keyword;
    const resp = await api.get("/product/export", {
      params,
      responseType: "blob"
    });
    const url = URL.createObjectURL(resp as any);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName.value;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("导出成功");
  } finally {
    exporting.value = false;
  }
}

async function downloadTemplate() {
  const resp = await api.get("/product/template", { responseType: "blob" });
  const url = URL.createObjectURL(resp as any);
  const a = document.createElement("a");
  a.href = url;
  a.download = "商品导入模板.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImport(file: any) {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await api.post("/product/import", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    importResult.value = res.data;
    importVisible.value = true;
  } catch {
    /* error handled by interceptor */
  }
  return false;
}

async function loadCategoryTree() {
  try {
    const res = await api.get("/product/category/list");
    categoryTree.value = res.data.list || [];
    const map: Record<number, any> = {};
    (res.data.list || []).forEach((c: any) => {
      map[c.id] = c;
    });
    categoryMap.value = map;
  } catch {
    /* empty */
  }
}

const dialogVisible = ref(false);
const dialogTitle = ref("新增商品");
const saving = ref(false);
const form = reactive({
  id: null as number | null,
  product_code: "",
  product_name: "",
  product_model: "",
  category_id: null as number | null,
  count_unit: "包",
  weight_unit: "吨",
  package_type: "捆扎",
  package_color: "",
  strap_color: "",
  sale_price: null as number | null,
  cost_price: null as number | null,
  default_min_alert_weight: 20,
  default_max_alert_weight: 200,
  status: "正常",
  remark: "",
  image_url: ""
});
const formRef = ref();
const formRules = {
  product_code: [
    { required: true, message: "请输入产品编码", trigger: "blur" }
  ],
  product_name: [
    { required: true, message: "请输入产品名称", trigger: "blur" }
  ],
  product_model: [{ required: true, message: "请输入型号", trigger: "blur" }]
};

function onCategoryChange(id: number) {
  const cat = categoryMap.value[id];
  if (cat && cat.category_name === "腈纶") {
    form.count_unit = "包";
    form.weight_unit = "吨";
    form.package_type = "捆扎";
  }
}

function handleImageChange(file: any) {
  const reader = new FileReader();
  reader.onload = () => {
    form.image_url = reader.result as string;
  };
  reader.readAsDataURL(file.raw);
}

function handleImageRemove() {
  form.image_url = "";
}

function openDialog(row?: any) {
  if (row?.id) {
    dialogTitle.value = "编辑商品";
    Object.assign(form, { ...row, status: row.status || "正常" });
  } else {
    dialogTitle.value = "新增商品";
    Object.assign(form, {
      id: null,
      product_code: "",
      product_name: "",
      product_model: "",
      category_id: null,
      count_unit: "包",
      weight_unit: "吨",
      package_type: "捆扎",
      package_color: "",
      strap_color: "",
      sale_price: null,
      cost_price: null,
      default_min_alert_weight: 20,
      default_max_alert_weight: 200,
      status: "正常",
      remark: "",
      image_url: ""
    });
  }
  dialogVisible.value = true;
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (form.id) {
      await api.put(`/product/${form.id}`, { ...form });
    } else {
      await api.post("/product", { ...form });
    }
    ElMessage.success(form.id ? "修改成功" : "新增成功");
    dialogVisible.value = false;
    fetchData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(
    `确定删除「${row.product_name}」吗？`,
    "删除确认",
    { confirmButtonText: "确定删除", cancelButtonText: "取消", type: "warning" }
  );
  await api.delete(`/product/${row.id}`);
  ElMessage.success("删除成功");
  fetchData();
}

const importVisible = ref(false);
const importResult = ref<any>(null);

onMounted(() => {
  fetchData();
  loadCategoryTree();
});
</script>

<template>
  <div class="p-5">
    <!-- ==================== 统计摘要卡片 ==================== -->
    <div class="flex gap-4 mb-4">
      <div
        v-for="card in statsCards"
        :key="card.label"
        class="wms-card flex-1 flex items-center gap-3"
        :style="{ padding: '16px 20px' }"
      >
        <div class="flex items-center justify-center rounded-lg" :style="{ width: '40px', height: '40px', background: card.color + '15', color: card.color }">
          <el-icon :size="20"><component :is="useRenderIcon(card.icon)" /></el-icon>
        </div>
        <div>
          <div class="text-xs" :style="{ color: 'var(--el-text-color-secondary)' }">{{ card.label }}</div>
          <div class="text-xl font-semibold" :style="{ color: 'var(--el-text-color-primary)' }">{{ card.value }}</div>
        </div>
      </div>
    </div>

    <!-- 筛选条件卡片 -->
    <div
      class="wms-card mb-4"
      :style="{ padding: '20px 24px' }"
    >
      <div
        class="flex items-center gap-2 mb-4 text-sm font-semibold"
        :style="{ color: 'var(--el-text-color-primary)' }"
      >
        <span
          class="inline-block w-1 h-4 rounded"
          :style="{ background: 'var(--el-color-primary)' }"
        />
        筛选条件
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <el-form :inline="true" :model="searchForm" class="mb-0!">
          <el-form-item label="关键词" class="mb-0!">
            <el-input
              v-model="searchForm.keyword"
              placeholder="搜索编码/名称/型号"
              clearable
              :prefix-icon="useRenderIcon(Search)"
              class="w-56!"
              @keyup.enter="onSearch"
            />
          </el-form-item>
        </el-form>
        <el-divider direction="vertical" class="h-6!" />
        <div class="flex items-center gap-2">
          <el-button
            type="primary"
            :icon="useRenderIcon(Search)"
            :loading="loading"
            size="default"
            @click="onSearch"
            >查询</el-button
          >
          <el-button
            :icon="useRenderIcon(Refresh)"
            size="default"
            @click="resetForm"
            >重置</el-button
          >
        </div>
        <el-divider direction="vertical" class="h-6!" />
        <div class="flex items-center gap-2">
          <el-button
            type="primary"
            :icon="useRenderIcon(Plus)"
            size="default"
            @click="openDialog()"
            >新增商品</el-button
          >
          <el-button
            type="success"
            :icon="useRenderIcon(Download)"
            size="default"
            :loading="exporting"
            @click="handleExport"
            >导出 Excel</el-button
          >
          <el-button
            :icon="useRenderIcon(Download)"
            size="default"
            @click="downloadTemplate"
            >下载模板</el-button
          >
          <el-upload
            :show-file-list="false"
            :before-upload="handleImport"
            accept=".xlsx"
          >
            <el-button
              type="warning"
              :icon="useRenderIcon(Upload)"
              size="default"
              >导入 Excel</el-button
            >
          </el-upload>
        </div>
      </div>
    </div>

    <!-- 表格卡片 -->
    <PureTableBar title="商品管理" :columns="columns" storage-key="Product" @refresh="onSearch">
      <template v-slot="{ size, dynamicColumns, onColumnResize, tableRefreshKey }">
        <pure-table :key="tableRefreshKey"
          @header-dragend="(newWidth, _oldWidth, col) => onColumnResize(col.label || col.property, newWidth)"
          row-key="id"
          border
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="left"
         
          stripe
          :loading="loading"
          :size="size"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="{ ...pagination, size }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)',
            fontWeight: 600,
            height: '48px'
          }"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #empty>
            <EmptyState title="暂无商品数据" description="调整筛选条件或点击新增" />
          </template>
          <template #sale_price="{ row }">
            {{
              row.sale_price != null ? Number(row.sale_price).toFixed(2) : "-"
            }}
          </template>
          <template #cost_price="{ row }">
            {{
              row.cost_price != null ? Number(row.cost_price).toFixed(2) : "-"
            }}
          </template>
          <template #status="{ row }">
            <el-tag
              effect="plain"
              :type="row.status === '正常' ? 'success' : 'info'"
              size="small"
              >{{ row.status }}</el-tag
            >
          </template>
          <template #operation="{ row }">
            <div class="flex gap-2">
              <el-button
                link
                type="primary"
                size="small"
                :icon="useRenderIcon(EditPen)"
                @click="openDialog(row)"
                >编辑</el-button
              >
              <el-button
                link
                type="danger"
                size="small"
                :icon="useRenderIcon(Delete)"
                @click="handleDelete(row)"
                >删除</el-button
              >
            </div>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="800px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="110px"
      >
        <el-row :gutter="16">
          <el-col :span="12"
            ><el-form-item label="产品编码" prop="product_code"
              ><el-input
                v-model="form.product_code"
                placeholder="请输入产品编码" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="产品名称" prop="product_name"
              ><el-input
                v-model="form.product_name"
                placeholder="请输入产品名称" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="型号" prop="product_model"
              ><el-input
                v-model="form.product_model"
                placeholder="请输入型号" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="所属分类"
              ><el-tree-select
                v-model="form.category_id"
                :data="categoryTree"
                :props="{
                  label: 'category_name',
                  value: 'id',
                  children: 'children'
                }"
                placeholder="选择分类"
                check-strictly
                clearable
                class="w-full!"
                @change="onCategoryChange" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="计数单位"
              ><el-input
                v-model="form.count_unit"
                placeholder="例：包、件、箱" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="计重单位"
              ><el-input
                v-model="form.weight_unit"
                placeholder="例：吨、千克" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="包装类型"
              ><el-input
                v-model="form.package_type"
                placeholder="例：捆扎、袋装" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="包装颜色"
              ><el-input
                v-model="form.package_color"
                placeholder="例：白色、透明" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="包带颜色"
              ><el-input
                v-model="form.strap_color"
                placeholder="例：红色、蓝色" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="销售参考价"
              ><el-input-number
                v-model="form.sale_price"
                :min="0"
                :precision="2"
                controls-position="right"
                class="w-full!" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="最近成本"
              ><el-input-number
                v-model="form.cost_price"
                :min="0"
                :precision="2"
                controls-position="right"
                class="w-full!" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="预警下限(吨)"
              ><el-input-number
                v-model="form.default_min_alert_weight"
                :min="0"
                :precision="4"
                controls-position="right"
                class="w-full!" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="预警上限(吨)"
              ><el-input-number
                v-model="form.default_max_alert_weight"
                :min="0"
                :precision="4"
                controls-position="right"
                class="w-full!" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="状态"
              ><el-select v-model="form.status" class="w-full!"
                ><el-option label="正常" value="正常" /><el-option
                  label="停用"
                  value="停用" /></el-select></el-form-item
          ></el-col>
          <el-col :span="24"
            ><el-form-item label="备注"
              ><el-input
                v-model="form.remark"
                type="textarea"
                :rows="2"
                placeholder="请输入备注信息" /></el-form-item
          ></el-col>
          <el-col :span="24">
            <el-form-item label="图片">
              <div class="flex items-center gap-3">
                <el-upload
                  :auto-upload="false"
                  :show-file-list="false"
                  accept="image/*"
                  :on-change="handleImageChange"
                >
                  <el-button type="primary" plain size="default"
                    >选择图片</el-button
                  >
                </el-upload>
                <el-button
                  v-if="form.image_url"
                  type="danger"
                  plain
                  size="default"
                  @click="handleImageRemove"
                  >移除图片</el-button
                >
              </div>
              <img
                v-if="form.image_url"
                :src="form.image_url"
                class="mt-3 rounded"
                style="
                  max-width: 160px;
                  max-height: 120px;
                  object-fit: cover;
                  border: 1px solid var(--el-border-color-lighter);
                "
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave"
            >保存</el-button
          >
        </div>
      </template>
    </el-dialog>

    <!-- 导入结果 -->
    <el-dialog
      v-model="importVisible"
      title="导入结果"
      width="500px"
      :close-on-click-modal="false"
    >
      <div v-if="importResult">
        <p class="text-base">
          成功:
          <strong class="text-green-600">{{
            importResult.successCount
          }}</strong>
          条，失败:
          <strong class="text-red-500">{{ importResult.failCount }}</strong> 条
        </p>
        <div
          v-if="importResult.errors?.length > 0"
          class="mt-3"
          style="max-height: 300px; overflow: auto"
        >
          <div
            v-for="(e, i) in importResult.errors"
            :key="i"
            class="text-sm mb-1"
            :style="{ color: 'var(--el-color-danger)' }"
          >
            第 {{ e.row }} 行: {{ e.errors?.join("；") }}
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="importVisible = false">关闭</el-button>
          <el-button
            type="primary"
            @click="
              importVisible = false;
              fetchData();
            "
            >刷新列表</el-button
          >
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.operation-btn {
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}

.operation-btn:hover {
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
  transform: scale(1.1);
}

:deep(.el-table__body-wrapper .el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}
:deep(.el-table__body-wrapper .el-table__row:hover > td) {
  background-color: var(--el-fill-color-light) !important;
}
</style>

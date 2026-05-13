<script setup lang="ts">
import dayjs from "dayjs";
import { getSecurityLogsApi } from "@/api/user";
import { responseList, responseTotal } from "@/utils/responseList";
import { reactive, ref, onMounted } from "vue";
import { deviceDetection } from "@pureadmin/utils";
import type { PaginationProps } from "@pureadmin/table";

defineOptions({
  name: "SecurityLog"
});

const loading = ref(true);
const dataList = ref([]);
const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true,
  layout: "prev, pager, next"
});
const columns: TableColumnList = [
  {
    label: "详情",
    prop: "summary",
    minWidth: 140
  },
  {
    label: "IP 地址",
    prop: "ip",
    minWidth: 100
  },
  {
    label: "地点",
    prop: "address",
    minWidth: 140
  },
  {
    label: "操作系统",
    prop: "system",
    minWidth: 100
  },
  {
    label: "浏览器类型",
    prop: "browser",
    minWidth: 100
  },
  {
    label: "时间",
    prop: "operatingTime",
    minWidth: 180,
    formatter: ({ operatingTime }) =>
      dayjs(operatingTime).format("YYYY-MM-DD HH:mm:ss")
  }
];

async function onSearch() {
  loading.value = true;
  try {
    const res: any = await getSecurityLogsApi({
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    });
    if (res.code === 200 && res.data) {
      dataList.value = responseList(res.data);
      pagination.total = responseTotal(res.data);
      if (res.data.pageSize != null) pagination.pageSize = res.data.pageSize;
      if (res.data.currentPage != null) {
        pagination.currentPage = res.data.currentPage;
      }
    }
  } finally {
    loading.value = false;
  }
}

function handleSizeChange(val: number) {
  pagination.pageSize = val;
  pagination.currentPage = 1;
  onSearch();
}

function handleCurrentChange(val: number) {
  pagination.currentPage = val;
  onSearch();
}

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div :class="['min-w-45', deviceDetection() ? 'max-w-full' : 'max-w-[70%]']">
    <h3 class="my-8!">安全日志</h3>
    <pure-table
      row-key="id"
      :loading="loading"
      :data="dataList"
      :columns="columns"
      :pagination="pagination"
      @page-size-change="handleSizeChange"
      @page-current-change="handleCurrentChange"
    />
  </div>
</template>

<script setup lang="ts">
import { isEqual } from "@pureadmin/utils";
import { transformI18n } from "@/plugins/i18n";
import { useRoute, useRouter } from "vue-router";
import { ref, watch, onMounted, toRaw } from "vue";
import { getParentPaths, findRouteByPath } from "@/router/utils";
import { useMultiTagsStoreHook } from "@/store/modules/multiTags";
import { usePermissionStoreHook } from "@/store/modules/permission";

const route = useRoute();
const levelList = ref([]);
const router = useRouter();
const multiTags: any = useMultiTagsStoreHook().multiTags;

function getRoutes() {
  return usePermissionStoreHook().constantMenus;
}

const getBreadcrumb = (): void => {
  // 当前路由信息
  let currentRoute;

  if (Object.keys(route.query).length > 0) {
    multiTags.forEach(item => {
      if (isEqual(route.query, item?.query)) {
        currentRoute = toRaw(item);
      }
    });
  } else if (Object.keys(route.params).length > 0) {
    multiTags.forEach(item => {
      if (isEqual(route.params, item?.params)) {
        currentRoute = toRaw(item);
      }
    });
  } else {
    currentRoute = findRouteByPath(router.currentRoute.value.path, getRoutes());
  }

  // 带参数的路由（编辑/详情）未加入 multiTags（showLink:false），
  // 通过 route.matched 获取当前路由定义
  if (!currentRoute) {
    const matchedRecords = router.currentRoute.value.matched;
    currentRoute = toRaw(matchedRecords[matchedRecords.length - 1]);
  }

  // 当前路由的父级路径组成的数组
  const parentRoutes = getParentPaths(
    router.currentRoute.value.name as string,
    getRoutes(),
    "name"
  );
  // 存放组成面包屑的数组
  const matched = [];

  // 获取每个父级路径对应的路由信息
  parentRoutes.forEach(path => {
    if (path !== "/") matched.push(findRouteByPath(path, getRoutes()));
  });

  matched.push(currentRoute);

  // 如果当前路由有 activeMenu（如从列表进入新建/编辑/详情），插入对应层级
  if (currentRoute?.meta?.activeMenu) {
    const activeMenuRoute = findRouteByPath(
      currentRoute.meta.activeMenu as string,
      getRoutes()
    );
    if (
      activeMenuRoute &&
      !matched.find(m => m.path === activeMenuRoute.path)
    ) {
      matched.splice(matched.length - 1, 0, activeMenuRoute);
    }
  }

  matched.forEach((item, index) => {
    if (currentRoute?.query || currentRoute?.params) return;
    if (item?.children) {
      item.children.forEach(v => {
        if (v?.meta?.title === item?.meta?.title) {
          matched.splice(index, 1);
        }
      });
    }
  });

  levelList.value = matched.filter(
    item => item?.meta && item?.meta.title !== false
  );
};

const handleLink = item => {
  const { redirect, name, path } = item;
  if (redirect) {
    router.push(redirect as any);
  } else {
    if (name) {
      if (item.query) {
        router.push({
          name,
          query: item.query
        });
      } else if (item.params) {
        router.push({
          name,
          params: item.params
        });
      } else {
        router.push({ name });
      }
    } else {
      router.push({ path });
    }
  }
};

onMounted(() => {
  getBreadcrumb();
});

watch(
  () => route.path,
  () => {
    getBreadcrumb();
  },
  {
    deep: true
  }
);
</script>

<template>
  <el-breadcrumb class="leading-12.5! select-none" separator="/">
    <transition-group name="breadcrumb">
      <el-breadcrumb-item
        v-for="item in levelList"
        :key="item.path"
        class="inline! items-stretch!"
      >
        <a @click.prevent="handleLink(item)">
          {{ transformI18n(item.meta.title) }}
        </a>
      </el-breadcrumb-item>
    </transition-group>
  </el-breadcrumb>
</template>

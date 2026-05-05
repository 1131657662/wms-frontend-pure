<script setup lang="ts">
defineOptions({ name: "ActiveUserTags" });

interface User {
  name: string;
}

defineProps<{ users: User[] }>();
</script>

<template>
  <div class="tags-wrapper">
    <el-tag
      v-for="user in users"
      :key="user.name"
      size="default"
      effect="plain"
      round
      class="user-tag"
    >
      <span class="tag-dot" />
      {{ user.name }}
    </el-tag>
    <span v-if="!users.length" class="tags-empty">暂无活跃用户</span>
  </div>
</template>

<style scoped>

.tags-wrapper { display: flex; flex-wrap: wrap; gap: 8px; }
.user-tag { cursor: default; }
.tag-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--el-color-success);
  margin-right: 6px;
}
.tags-empty {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}
</style>

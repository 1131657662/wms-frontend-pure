<template>
  <el-empty :image-size="imageSize" :image="image">
    <template #description>
      <div class="empty-content">
        <p v-if="title" class="empty-title">{{ title }}</p>
        <p v-if="description" class="empty-desc">{{ description }}</p>
        <div v-if="$slots.actions" class="empty-actions">
          <slot name="actions" />
        </div>
      </div>
    </template>
    <template v-if="$slots.image" #image>
      <slot name="image" />
    </template>
  </el-empty>
</template>

<script setup lang="ts">
defineOptions({ name: "EmptyState" });

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    imageSize?: number;
    image?: string;
  }>(),
  {
    title: "",
    description: "",
    imageSize: 80,
    image: undefined
  }
);
</script>

<style scoped>
/* 抹平 Element Plus el-empty 默认间距 */
:deep(.el-empty__description) {
  margin-top: 0;
}
:deep(.el-empty__description p) {
  margin: 0;
  height: auto;
  line-height: 1.4;
}
:deep(.el-empty__image) {
  margin-bottom: 8px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.empty-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
.empty-desc {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  max-width: 280px;
  text-align: center;
  line-height: 1.4;
}
.empty-actions {
  margin-top: 2px;
}
</style>

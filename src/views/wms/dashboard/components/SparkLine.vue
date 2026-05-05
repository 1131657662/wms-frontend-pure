<script setup lang="ts">
import { computed, ref, onMounted } from "vue";

const props = withDefaults(defineProps<{
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}>(), {
  color: "#409EFF",
  width: 80,
  height: 24
});

const visible = ref(false);

onMounted(() => {
  visible.value = true;
});

const min = computed(() => {
  if (props.data.length === 0) return 0;
  return Math.min(...props.data);
});

const max = computed(() => {
  if (props.data.length === 0) return 0;
  return Math.max(...props.data);
});

const range = computed(() => max.value - min.value || 1);

interface Point { x: number; y: number }

const points = computed<Point[]>(() => {
  const len = props.data.length;
  if (len === 0) return [];
  if (len === 1) {
    return [{ x: props.width / 2, y: props.height / 2 }];
  }
  const stepX = props.width / (len - 1);
  return props.data.map((v, i) => ({
    x: i * stepX,
    y: props.height - ((v - min.value) / range.value) * (props.height - 4) - 2
  }));
});

const polylinePoints = computed(() =>
  points.value.map(p => `${p.x},${p.y}`).join(" ")
);

const gradientId = "spark-grad-" + Math.random().toString(36).slice(2, 8);

const pathLength = computed(() => {
  const pts = points.value;
  if (pts.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.sqrt((pts[i].x - pts[i-1].x) ** 2 + (pts[i].y - pts[i-1].y) ** 2);
  }
  return len;
});
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    class="sparkline"
    role="img"
    aria-label="趋势图"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.2" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <polygon
      v-if="data.length >= 2"
      :points="`0,${height} ${polylinePoints} ${width},${height}`"
      :fill="`url(#${gradientId})`"
      class="spark-fill"
    />
    <polyline
      v-if="data.length >= 1"
      :points="polylinePoints"
      fill="none"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="spark-line"
      :style="{
        strokeDasharray: pathLength,
        strokeDashoffset: visible ? 0 : pathLength
      }"
    />
    <circle
      v-if="data.length >= 1"
      :cx="points[points.length - 1].x"
      :cy="points[points.length - 1].y"
      r="2.5"
      :fill="color"
      class="spark-dot"
    />
  </svg>
</template>

<style scoped>
.sparkline {
  display: block;
  overflow: visible;
}

.spark-line {
  transition: stroke-dashoffset 0.8s ease;
}

.spark-fill {
  opacity: 0;
  transition: opacity 0.5s ease 0.6s;
}

.sparkline:hover .spark-fill {
  opacity: 1;
}

.spark-dot {
  stroke: var(--el-bg-color, #fff);
  stroke-width: 1.5;
}
</style>

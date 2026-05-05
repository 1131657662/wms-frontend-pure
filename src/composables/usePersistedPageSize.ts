import { ref, watch } from "vue";

const STORAGE_PREFIX = "page-size-";

/** 持久化每页条数到 localStorage */
export function usePersistedPageSize(key: string, defaultSize = 20) {
  const stored = localStorage.getItem(STORAGE_PREFIX + key);
  const initial = Number(stored) || defaultSize;
  const pageSize = ref(initial > 0 ? initial : defaultSize);

  watch(pageSize, (val) => {
    localStorage.setItem(STORAGE_PREFIX + key, String(val));
  });

  return pageSize;
}

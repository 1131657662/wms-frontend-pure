import { onMounted, ref } from "vue";

/** el-table 列宽持久化（localStorage） */
export function useElTableColumnWidths(
  storageKey: string,
  defaults: Record<string, number>
) {
  const widths = ref<Record<string, number>>({ ...defaults });

  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number>;
      widths.value = { ...defaults, ...parsed };
    } catch {
      /* ignore */
    }
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widths.value));
    } catch {
      /* ignore */
    }
  }

  function widthFor(columnLabel: string) {
    return widths.value[columnLabel] ?? defaults[columnLabel];
  }

  function onHeaderDragEnd(newWidth: number, _oldWidth: number, column: any) {
    const label = column.label || column.property;
    if (!label) return;
    widths.value = { ...widths.value, [label]: newWidth };
    save();
  }

  onMounted(load);

  return { widthFor, onHeaderDragEnd };
}

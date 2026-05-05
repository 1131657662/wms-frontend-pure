import Sortable from "sortablejs";
import { $t, transformI18n } from "@/plugins/i18n";
import type { CheckboxValueType } from "element-plus";
import { useEpThemeStoreHook } from "@/store/modules/epTheme";
import {
  type PropType,
  ref,
  unref,
  computed,
  watch,
  nextTick,
  defineComponent,
  getCurrentInstance
} from "vue";
import {
  delay,
  cloneDeep,
  isBoolean,
  isFunction,
  getKeyList
} from "@pureadmin/utils";

import PinAngle from "~icons/bi/pin-angle";
import Fullscreen from "~icons/ri/fullscreen-fill";
import PinAngleFill from "~icons/bi/pin-angle-fill";
import ExitFullscreen from "~icons/ri/fullscreen-exit-fill";
import DragIcon from "@/assets/table-bar/drag.svg?component";
import ExpandIcon from "@/assets/table-bar/expand.svg?component";
import RefreshIcon from "@/assets/table-bar/refresh.svg?component";
import SettingIcon from "@/assets/table-bar/settings.svg?component";
import CollapseIcon from "@/assets/table-bar/collapse.svg?component";

const props = {
  /** 头部最左边的标题 */
  title: {
    type: String,
    default: $t("tableBar.pureList")
  },
  /** 对于树形表格，如果想启用展开和折叠功能，传入当前表格的ref即可 */
  tableRef: {
    type: Object as PropType<any>
  },
  /** 需要展示的列 */
  columns: {
    type: Array as PropType<TableColumnList>,
    default: () => []
  },
  isExpandAll: {
    type: Boolean,
    default: true
  },
  tableKey: {
    type: [String, Number] as PropType<string | number>,
    default: "0"
  },
  /** localStorage 存储键，传空字符串则不持久化 */
  storageKey: {
    type: String,
    default: ""
  }
};

const STORAGE_PREFIX = "table-columns-";

function saveColumnsConfig(key: string, columns: any[]) {
  localStorage.setItem(
    STORAGE_PREFIX + key,
    JSON.stringify(
      columns.map(col => ({
        label: col.label,
        hide: !!col.hide,
        fixed: col.fixed || false,
        width: col.width
      }))
    )
  );
}

function loadAndMergeColumns(key: string, freshColumns: any[]): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return cloneDeep(freshColumns);
    const saved: Array<{ label: string; hide: boolean; fixed: string | false; width?: number }> =
      JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length === 0) return cloneDeep(freshColumns);

    const freshMap = new Map<string, any>();
    for (const col of freshColumns) {
      if (!freshMap.has(col.label)) freshMap.set(col.label, col);
    }
    const savedLabelSet = new Set(saved.map(s => s.label));

    // apply saved hide/fixed/width to fresh columns
    for (const s of saved) {
      const col = freshMap.get(s.label);
      if (col) {
        col.hide = s.hide;
        col.fixed = s.fixed || false;
        if (s.width != null) col.width = s.width;
      }
    }

    // reorder: saved order first (only labels still in fresh)
    const result: any[] = [];
    for (const s of saved) {
      const col = freshMap.get(s.label);
      if (col) result.push(col);
    }
    // append new columns not in saved config
    for (const col of freshColumns) {
      if (!savedLabelSet.has(col.label)) result.push(col);
    }
    return result;
  } catch {
    return cloneDeep(freshColumns);
  }
}

export default defineComponent({
  name: "PureTableBar",
  props,
  emits: ["refresh", "fullscreen"],
  setup(props, { emit, slots, attrs }) {
    const size = ref("default");
    const loading = ref(false);
    const checkAll = ref(true);
    const isFullscreen = ref(false);
    const isIndeterminate = ref(false);
    const tableRefreshKey = ref(0);
    const pageSizeKey = props.storageKey ? `page-size-${props.storageKey}` : null;
    const savedPageSize = ref(
      pageSizeKey ? Number(localStorage.getItem(pageSizeKey)) || 20 : 20
    );
    function savePageSize(val: number) {
      if (pageSizeKey) localStorage.setItem(pageSizeKey, String(val));
    }
    const instance = getCurrentInstance()!;
    const isExpandAll = ref(props.isExpandAll);
    const filterColumns = cloneDeep(props?.columns).filter(column =>
      isBoolean(column?.hide)
        ? !column.hide
        : !(isFunction(column?.hide) && column?.hide())
    );
    const dynamicColumns = ref(
      props.storageKey
        ? loadAndMergeColumns(props.storageKey, props?.columns)
        : cloneDeep(props?.columns)
    );
    const checkColumnList = ref(getKeyList(dynamicColumns.value, "label"));
    const checkedColumns = ref(
      getKeyList(
        dynamicColumns.value.filter(col =>
          isBoolean(col?.hide) ? !col.hide : !(isFunction(col?.hide) && col?.hide())
        ),
        "label"
      )
    );

    // 深度监听列配置变化（显隐、冻结、列宽），自动持久化到 localStorage
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    watch(
      dynamicColumns,
      () => {
        if (!props.storageKey) return;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          saveColumnsConfig(props.storageKey, dynamicColumns.value);
        }, 500);
      },
      { deep: true }
    );

    function onColumnResize(columnLabel: string, newWidth: number) {
      const col = dynamicColumns.value.find(
        (c: any) => c.label === columnLabel || c.prop === columnLabel
      );
      if (col && col.width !== newWidth) {
        col.width = newWidth;
      }
    }

    const getDropdownItemStyle = computed(() => {
      return s => {
        return {
          background:
            s === size.value ? useEpThemeStoreHook().epThemeColor : "",
          color: s === size.value ? "#fff" : "var(--el-text-color-primary)"
        };
      };
    });

    const iconClass = computed(() => {
      return [
        "text-black",
        "dark:text-white",
        "duration-100",
        "hover:text-primary!",
        "cursor-pointer",
        "outline-hidden"
      ];
    });

    const topClass = computed(() => {
      return [
        "flex",
        "justify-between",
        "pt-0.75",
        "px-2.75",
        "border-b",
        "border-b-solid",
        "border-[#dcdfe6]",
        "dark:border-[#303030]"
      ];
    });

    function onReFresh() {
      loading.value = true;
      emit("refresh");
      delay(500).then(() => (loading.value = false));
    }

    function onExpand() {
      isExpandAll.value = !isExpandAll.value;
      toggleRowExpansionAll(props.tableRef.data, isExpandAll.value);
    }

    function onFullscreen() {
      isFullscreen.value = !isFullscreen.value;
      emit("fullscreen", isFullscreen.value);
    }

    function toggleRowExpansionAll(data, isExpansion) {
      data.forEach(item => {
        props.tableRef.toggleRowExpansion(item, isExpansion);
        if (item.children !== undefined && item.children !== null) {
          toggleRowExpansionAll(item.children, isExpansion);
        }
      });
    }

    function handleCheckAllChange(val: CheckboxValueType) {
      checkedColumns.value = val ? [...checkColumnList.value] : [];
      isIndeterminate.value = false;
      dynamicColumns.value.map(column =>
        val ? (column.hide = false) : (column.hide = true)
      );
    }

    function handleCheckedColumnsChange(value: CheckboxValueType[]) {
      checkedColumns.value = value;
      const checkedCount = value.length;
      checkAll.value = checkedCount === checkColumnList.value.length;
      isIndeterminate.value =
        checkedCount > 0 && checkedCount < checkColumnList.value.length;
    }

    function handleCheckColumnListChange(
      val: CheckboxValueType,
      label: string
    ) {
      dynamicColumns.value.filter(
        item => transformI18n(item.label) === transformI18n(label)
      )[0].hide = !val;
    }

    function handleToggleColumnFixed(fixed, label: string) {
      const column = dynamicColumns.value.find(
        item => transformI18n(item.label) === transformI18n(label)
      );
      if (column) {
        column.fixed = fixed;
      }
    }

    async function onReset() {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      checkAll.value = true;
      isIndeterminate.value = false;
      dynamicColumns.value = cloneDeep(props?.columns);
      checkColumnList.value = getKeyList(dynamicColumns.value, "label");
      checkedColumns.value = getKeyList(cloneDeep(filterColumns), "label");
      if (props.storageKey)
        localStorage.removeItem(STORAGE_PREFIX + props.storageKey);
    }

    const dropdown = {
      dropdown: () => (
        <el-dropdown-menu class="translation">
          <el-dropdown-item
            style={getDropdownItemStyle.value("large")}
            onClick={() => (size.value = "large")}
          >
            {transformI18n($t("tableBar.pureLarge"))}
          </el-dropdown-item>
          <el-dropdown-item
            style={getDropdownItemStyle.value("default")}
            onClick={() => (size.value = "default")}
          >
            {transformI18n($t("tableBar.pureDefault"))}
          </el-dropdown-item>
          <el-dropdown-item
            style={getDropdownItemStyle.value("small")}
            onClick={() => (size.value = "small")}
          >
            {transformI18n($t("tableBar.pureSmall"))}
          </el-dropdown-item>
        </el-dropdown-menu>
      )
    };

    /** 列展示拖拽排序 */
    const rowDrop = (event: { preventDefault: () => void }) => {
      event.preventDefault();
      nextTick(() => {
        const wrapper: HTMLElement = (
          instance?.proxy?.$refs[`GroupRef${unref(props.tableKey)}`] as any
        ).$el.firstElementChild;
        // 已有实例则跳过，避免销毁正在拖拽中的 Sortable 实例导致异常
        if (Sortable.get(wrapper)) return;
        Sortable.create(wrapper, {
          animation: 300,
          handle: ".drag-btn",
          onEnd: ({ newIndex, oldIndex, item }) => {
            const targetThElem = item;
            const wrapperElem = targetThElem.parentNode as HTMLElement;
            const oldColumn = dynamicColumns.value[oldIndex];
            const newColumn = dynamicColumns.value[newIndex];
            if (oldColumn?.fixed || newColumn?.fixed) {
              // 当前列存在fixed属性 则不可拖拽
              const oldThElem = wrapperElem.children[oldIndex] as HTMLElement;
              if (newIndex > oldIndex) {
                wrapperElem.insertBefore(targetThElem, oldThElem);
              } else {
                wrapperElem.insertBefore(
                  targetThElem,
                  oldThElem ? oldThElem.nextElementSibling : oldThElem
                );
              }
              return;
            }
            // 从 Sortable 整理后的 DOM 顺序读取标签序列，反推 dynamicColumns 正确顺序
            // 注意：el-space 可能包裹子元素，只取带有 data-label 的元素
            const newLabels: string[] = [];
            const children = Array.from(wrapperElem.children);
            for (const child of children) {
              if (!(child instanceof HTMLElement)) continue;
              const lbl = child.dataset.label || child.querySelector<HTMLElement>('[data-label]')?.dataset.label;
              if (lbl) newLabels.push(lbl);
            }
            const labelToCol = new Map<string, any>();
            for (const col of dynamicColumns.value) {
              labelToCol.set(transformI18n(col.label), col);
            }
            const reordered: any[] = [];
            for (const lbl of newLabels) {
              const col = labelToCol.get(lbl);
              // 浅拷贝列对象生成新引用，确保 ElTableColumn 的 watch 检测到 prop 变化
              if (col) reordered.push({ ...col });
            }
            // 兜底：追加未在 DOM 中出现的列（同样浅拷贝）
            for (const col of dynamicColumns.value) {
              if (!newLabels.includes(transformI18n(col.label))) {
                reordered.push({ ...col });
              }
            }
            dynamicColumns.value = reordered;
            checkColumnList.value = newLabels;
            // 递增 key 强制 ElTable 重建列组件，让 store 按新顺序重新收集列配置
            tableRefreshKey.value++;
          }
        });
      });
    };

    const isFixedColumn = (label: string) => {
      const column = dynamicColumns.value.find(
        item => transformI18n(item.label) === transformI18n(label)
      );
      const fixedOption = column?.fixed;
      const left = fixedOption === "left";
      const right = fixedOption === true || fixedOption === "right";
      return { fixed: left || right, left, right };
    };

    const rendTippyProps = (content: string) => {
      // https://vue-tippy.netlify.app/props
      return {
        content,
        offset: [0, 18],
        duration: [300, 0],
        followCursor: true,
        hideOnClick: "toggle"
      };
    };

    const reference = {
      reference: () => (
        <SettingIcon
          class={["w-4", iconClass.value]}
          v-tippy={rendTippyProps(
            transformI18n($t("tableBar.pureColumnSettings"))
          )}
        />
      )
    };

    return () => (
      <>
        <div
          {...attrs}
          class={[
            "w-full",
            "px-2",
            "pb-2",
            "bg-bg_color",
            "rounded",
            isFullscreen.value
              ? ["h-full!", "z-2002", "fixed", "inset-0"]
              : "mt-2"
          ]}
          style={{ boxShadow: "var(--el-box-shadow-light)", border: "1px solid var(--el-border-color-lighter)" }}
        >
          <div class="flex justify-between w-full h-15 p-4">
            {slots?.title ? (
              slots.title()
            ) : (
              <p class="font-bold truncate">{transformI18n(props.title)}</p>
            )}
            <div class="flex-ac">
              {slots?.buttons ? (
                <div class="flex mr-4">{slots.buttons()}</div>
              ) : null}
              {props.tableRef?.size ? (
                <>
                  <ExpandIcon
                    class={["w-4", iconClass.value]}
                    style={{
                      transform: isExpandAll.value ? "none" : "rotate(-90deg)"
                    }}
                    v-tippy={rendTippyProps(
                      isExpandAll.value
                        ? transformI18n($t("tableBar.pureCollapse"))
                        : transformI18n($t("tableBar.pureExpand"))
                    )}
                    onClick={() => onExpand()}
                  />
                  <el-divider direction="vertical" />
                </>
              ) : null}
              <RefreshIcon
                class={[
                  "w-4",
                  iconClass.value,
                  loading.value ? "animate-spin" : ""
                ]}
                v-tippy={rendTippyProps(
                  transformI18n($t("tableBar.pureRefresh"))
                )}
                onClick={() => onReFresh()}
              />
              <el-divider direction="vertical" />
              <el-dropdown
                v-slots={dropdown}
                trigger="click"
                v-tippy={rendTippyProps(
                  transformI18n($t("tableBar.pureDensity"))
                )}
              >
                <CollapseIcon class={["w-4", iconClass.value]} />
              </el-dropdown>
              <el-divider direction="vertical" />

              <el-popover
                v-slots={reference}
                placement="bottom-start"
                popper-style={{ padding: 0 }}
                width="245"
                trigger="click"
              >
                <div class={[topClass.value]}>
                  <el-checkbox
                    class="-mr-1!"
                    label={transformI18n($t("tableBar.pureColumnDisplay"))}
                    v-model={checkAll.value}
                    indeterminate={isIndeterminate.value}
                    onChange={value => handleCheckAllChange(value)}
                  />
                  <el-button type="primary" link onClick={() => onReset()}>
                    {transformI18n($t("tableBar.pureReset"))}
                  </el-button>
                </div>

                <div class="pt-1.5 pl-2.75">
                  <el-scrollbar max-height="36vh">
                    <el-checkbox-group
                      ref={`GroupRef${unref(props.tableKey)}`}
                      modelValue={checkedColumns.value}
                      onChange={value => handleCheckedColumnsChange(value)}
                    >
                      <el-space
                        direction="vertical"
                        alignment="flex-start"
                        size={0}
                      >
                        {checkColumnList.value.map((item, index) => {
                          const { fixed, left, right } = isFixedColumn(item);
                          return (
                            <div class="flex items-center" data-label={transformI18n(item)}>
                              <DragIcon
                                class={[
                                  "drag-btn w-4 mr-2",
                                  fixed ? "cursor-no-drop!" : "cursor-grab!"
                                ]}
                                onMouseenter={(event: {
                                  preventDefault: () => void;
                                }) => rowDrop(event)}
                              />
                              <el-checkbox
                                key={index}
                                label={item}
                                value={item}
                                onChange={value =>
                                  handleCheckColumnListChange(value, item)
                                }
                              >
                                <span
                                  title={transformI18n(item)}
                                  class="inline-block w-30 truncate hover:text-text_color_primary"
                                >
                                  {transformI18n(item)}
                                </span>
                              </el-checkbox>
                              <iconify-icon-offline
                                class={[
                                  "ml-2",
                                  "size-4",
                                  "hover:text-primary",
                                  "cursor-pointer",
                                  left ? "text-primary" : ""
                                ]}
                                icon={left ? PinAngleFill : PinAngle}
                                v-tippy={
                                  left
                                    ? transformI18n($t("tableBar.pureUnpin"))
                                    : transformI18n($t("tableBar.purePinLeft"))
                                }
                                onClick={() =>
                                  handleToggleColumnFixed(
                                    left ? false : "left",
                                    item
                                  )
                                }
                              />
                              <iconify-icon-offline
                                class={[
                                  "ml-2",
                                  "size-4",
                                  "hover:text-primary",
                                  "scale-x-[-1]",
                                  "cursor-pointer",
                                  right ? "text-primary" : ""
                                ]}
                                icon={right ? PinAngleFill : PinAngle}
                                v-tippy={
                                  right
                                    ? transformI18n($t("tableBar.pureUnpin"))
                                    : transformI18n($t("tableBar.purePinRight"))
                                }
                                onClick={() =>
                                  handleToggleColumnFixed(
                                    right ? false : "right",
                                    item
                                  )
                                }
                              />
                            </div>
                          );
                        })}
                      </el-space>
                    </el-checkbox-group>
                  </el-scrollbar>
                </div>
              </el-popover>
              <el-divider direction="vertical" />

              <iconify-icon-offline
                class={["w-4", iconClass.value]}
                icon={isFullscreen.value ? ExitFullscreen : Fullscreen}
                v-tippy={
                  isFullscreen.value
                    ? transformI18n($t("tableBar.pureExitFullScreen"))
                    : transformI18n($t("tableBar.pureFullScreen"))
                }
                onClick={() => onFullscreen()}
              />
            </div>
          </div>
          {slots.default({
            size: size.value,
            dynamicColumns: dynamicColumns.value,
            onColumnResize,
            tableRefreshKey: tableRefreshKey.value,
            savedPageSize: savedPageSize.value,
            savePageSizeConfig: savePageSize
          })}
        </div>
      </>
    );
  }
});

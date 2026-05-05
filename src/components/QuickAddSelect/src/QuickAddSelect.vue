<template>
  <div class="quick-add-select">
    <el-select
      :model-value="modelValue"
      v-bind="selectAttrs"
      :style="{ width: selectWidth }"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <el-option
        v-for="o in options"
        :key="o[valueKey]"
        :label="typeof labelKey === 'function' ? labelKey(o) : o[labelKey]"
        :value="o[valueKey]"
      />
    </el-select>
    <el-button
      v-if="canAdd"
      :icon="useRenderIcon(Plus)"
      circle
      size="small"
      type="primary"
      class="add-btn"
      :disabled="disabled"
      @click="visible = true"
    />

    <AddWarehouseDialog v-if="entityType === 'warehouse'" v-model="visible" @saved="onAdded" />
    <AddSupplierDialog v-if="entityType === 'supplier'" v-model="visible" @saved="onAdded" />
    <AddCustomerDialog v-if="entityType === 'customer'" v-model="visible" @saved="onAdded" />
    <AddVehicleDialog v-if="entityType === 'vehicle'" v-model="visible" @saved="onAdded" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useAttrs } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddFill from "~icons/ri/add-circle-line";

import AddWarehouseDialog from "@/views/wms/components/AddWarehouseDialog.vue";
import AddSupplierDialog from "@/views/wms/components/AddSupplierDialog.vue";
import AddCustomerDialog from "@/views/wms/components/AddCustomerDialog.vue";
import AddVehicleDialog from "@/views/wms/components/AddVehicleDialog.vue";

const Plus = AddFill;

const props = defineProps({
  modelValue: [String, Number],
  options: { type: Array, default: () => [] },
  entityType: { type: String, required: true },
  canAdd: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  selectWidth: { type: String, default: "200px" },
  labelKey: { type: [String, Function], default: "" },
  valueKey: { type: String, default: "" }
});

const emit = defineEmits(["update:modelValue", "added"]);

const attrs = useAttrs();
const selectAttrs = computed(() => {
  const {
    modelValue, options, entityType, canAdd, selectWidth, labelKey, valueKey,
    ...rest
  } = { ...props, ...attrs };
  delete (rest as any).onAdded;
  return rest;
});

const entityMap: Record<string, any> = {
  warehouse: { valueKey: "warehouse_code", labelKey: "warehouse_name" },
  supplier:  { valueKey: "supplier_code",  labelKey: "supplier_name" },
  customer:  { valueKey: "customer_code",  labelKey: "customer_name" },
  vehicle:   { valueKey: "plate_number",   labelKey: "plate_number" }
};

const config = computed(() => entityMap[props.entityType] || { valueKey: "id", labelKey: "name" });
const valueKey = computed(() => props.valueKey || config.value.valueKey);
const labelKey = computed(() => props.labelKey || config.value.labelKey);

const visible = ref(false);

function onAdded(record: any) {
  const newValue = record[valueKey.value] ?? "";
  emit("added", record);
  emit("update:modelValue", newValue);
}
</script>

<style scoped>
.quick-add-select {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.add-btn {
  flex-shrink: 0;
}
</style>

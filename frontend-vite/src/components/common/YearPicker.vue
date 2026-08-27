<template>
  <div class="modern-year-picker" :style="{ '--yp-accent': accentColor }">
    <el-date-picker
      :model-value="internalValue"
      type="year"
      :placeholder="placeholder"
      format="YYYY年"
      value-format="YYYY"
      :clearable="clearable"
      size="default"
      popper-class="modern-year-picker-popper"
      @update:model-value="onUpdate"
      @change="onChange"
      @clear="onClear"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: [Number, String, null], default: null },
  accentColor: { type: String, default: '#0052d9' },
  clearable: { type: Boolean, default: true },
  placeholder: { type: String, default: '选择年份' }
});

const emit = defineEmits(['update:modelValue', 'change', 'clear']);

const internalValue = computed(() => {
  if (props.modelValue == null || props.modelValue === '') return null;
  return String(props.modelValue);
});

const onUpdate = (val) => {
  emit('update:modelValue', val ? Number(val) : null);
};

const onChange = (val) => {
  emit('change', val ? Number(val) : null);
};

const onClear = () => {
  emit('update:modelValue', null);
  emit('clear');
};
</script>

<style scoped>
.modern-year-picker {
  display: inline-flex;
  align-items: center;
}

.modern-year-picker :deep(.el-date-editor) {
  --el-input-border-color: #dcdcdc;
  --el-input-hover-border-color: var(--yp-accent, #0052d9);
  --el-input-focus-border-color: var(--yp-accent, #0052d9);
  --el-color-primary: var(--yp-accent, #0052d9);
  width: 130px;
  height: 32px;
  border-radius: 6px;
  box-shadow: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.modern-year-picker :deep(.el-date-editor:hover) {
  border-color: var(--yp-accent, #0052d9);
}

.modern-year-picker :deep(.el-date-editor.is-active),
.modern-year-picker :deep(.el-date-editor:focus-within) {
  border-color: var(--yp-accent, #0052d9);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--yp-accent, #0052d9) 15%, transparent);
}

.modern-year-picker :deep(.el-input__inner) {
  font-size: 13px;
  color: #333;
}

.modern-year-picker :deep(.el-input__inner::placeholder) {
  color: #bbb;
}

.modern-year-picker :deep(.el-input__prefix),
.modern-year-picker :deep(.el-input__suffix) {
  color: #999;
}

@media (max-width: 480px) {
  .modern-year-picker :deep(.el-date-editor) {
    width: 100%;
    min-width: 0;
  }
}
</style>

<style>
.modern-year-picker-popper.el-picker__popper {
  border: none;
  border-radius: 8px;
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1);
}

.modern-year-picker-popper .el-picker-panel {
  border-radius: 8px;
  border: none;
}

.modern-year-picker-popper .el-date-picker__header {
  padding: 12px 16px 8px;
}

.modern-year-picker-popper .el-date-picker__header-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.modern-year-picker-popper .el-picker-panel__icon-btn {
  color: #666;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.modern-year-picker-popper .el-picker-panel__icon-btn:hover {
  color: var(--el-color-primary, #0052d9);
  background: #f3f3f3;
}

.modern-year-picker-popper .el-year-table td .cell {
  width: 56px;
  height: 32px;
  line-height: 32px;
  border-radius: 6px;
  font-size: 13px;
  color: #333;
  transition: background 0.15s, color 0.15s;
}

.modern-year-picker-popper .el-year-table td .cell:hover {
  background: #f3f3f3;
  color: #333;
}

.modern-year-picker-popper .el-year-table td.today .cell {
  color: var(--el-color-primary, #0052d9);
  font-weight: 600;
}

.modern-year-picker-popper .el-year-table td.current:not(.disabled) .cell {
  background: var(--el-color-primary, #0052d9);
  color: #fff;
  font-weight: 500;
}

.modern-year-picker-popper .el-year-table td.disabled .cell {
  color: #ccc;
  background: transparent;
}
</style>

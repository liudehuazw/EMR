<template>
  <div class="modern-date-range-picker" :style="{ '--drp-accent': accentColor }">
    <el-date-picker
      v-model="internalValue"
      type="daterange"
      range-separator="至"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      format="YYYY/MM/DD"
      value-format="YYYY-MM-DD"
      :clearable="clearable"
      size="default"
      popper-class="modern-date-range-popper"
      @change="onChange"
      @clear="onClear"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  start: { type: String, default: '' },
  end: { type: String, default: '' },
  accentColor: { type: String, default: '#0052d9' },
  clearable: { type: Boolean, default: true }
});

const emit = defineEmits(['update:start', 'update:end', 'change', 'clear']);

const internalValue = computed({
  get() {
    if (props.start && props.end) return [props.start, props.end];
    return null;
  },
  set(val) {
    if (!val || !Array.isArray(val)) {
      emit('update:start', '');
      emit('update:end', '');
      return;
    }
    emit('update:start', val[0] || '');
    emit('update:end', val[1] || '');
  }
});

const onChange = (val) => {
  emit('change', val);
};

const onClear = () => {
  emit('update:start', '');
  emit('update:end', '');
  emit('clear');
};
</script>

<style scoped>
.modern-date-range-picker {
  display: inline-flex;
  align-items: center;
}

.modern-date-range-picker :deep(.el-date-editor) {
  --el-input-border-color: #dcdcdc;
  --el-input-hover-border-color: var(--drp-accent, #0052d9);
  --el-input-focus-border-color: var(--drp-accent, #0052d9);
  --el-color-primary: var(--drp-accent, #0052d9);
  width: 280px;
  height: 32px;
  border-radius: 6px;
  box-shadow: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.modern-date-range-picker :deep(.el-date-editor:hover) {
  border-color: var(--drp-accent, #0052d9);
}

.modern-date-range-picker :deep(.el-date-editor.is-active),
.modern-date-range-picker :deep(.el-date-editor:focus-within) {
  border-color: var(--drp-accent, #0052d9);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--drp-accent, #0052d9) 15%, transparent);
}

.modern-date-range-picker :deep(.el-range-input) {
  font-size: 13px;
  color: #333;
}

.modern-date-range-picker :deep(.el-range-input::placeholder) {
  color: #bbb;
}

.modern-date-range-picker :deep(.el-range-separator) {
  color: #999;
  font-size: 13px;
  padding: 0 4px;
}

.modern-date-range-picker :deep(.el-range__icon) {
  color: #999;
  font-size: 14px;
}

.modern-date-range-picker :deep(.el-range__close-icon) {
  color: #bbb;
  font-size: 13px;
}

@media (max-width: 480px) {
  .modern-date-range-picker :deep(.el-date-editor) {
    width: 100%;
    min-width: 0;
  }
}
</style>

<!-- Popper teleports to body; styles must be global -->
<style>
.modern-date-range-popper.el-picker__popper {
  border: none;
  border-radius: 8px;
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1);
}

.modern-date-range-popper .el-picker-panel {
  border-radius: 8px;
  border: none;
}

.modern-date-range-popper .el-date-range-picker__header {
  padding: 12px 16px 8px;
}

.modern-date-range-popper .el-date-range-picker__header div {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.modern-date-range-popper .el-picker-panel__icon-btn {
  color: #666;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.modern-date-range-popper .el-picker-panel__icon-btn:hover {
  color: var(--el-color-primary, #0052d9);
  background: #f3f3f3;
}

.modern-date-range-popper .el-date-table th {
  color: #999;
  font-weight: 500;
  font-size: 12px;
  border-bottom: none;
}

.modern-date-range-popper .el-date-table td {
  padding: 2px 0;
}

.modern-date-range-popper .el-date-table td .el-date-table-cell {
  height: 32px;
  padding: 0;
}

.modern-date-range-popper .el-date-table td .el-date-table-cell__text {
  width: 28px;
  height: 28px;
  line-height: 28px;
  border-radius: 6px;
  font-size: 13px;
  transition: background 0.15s, color 0.15s;
}

.modern-date-range-popper .el-date-table td.available:hover .el-date-table-cell__text {
  background: #f3f3f3;
  color: #333;
}

.modern-date-range-popper .el-date-table td.today .el-date-table-cell__text {
  color: var(--el-color-primary, #0052d9);
  font-weight: 600;
}

.modern-date-range-popper .el-date-table td.in-range .el-date-table-cell {
  background: color-mix(in srgb, var(--el-color-primary, #0052d9) 8%, #fff);
}

.modern-date-range-popper .el-date-table td.start-date .el-date-table-cell__text,
.modern-date-range-popper .el-date-table td.end-date .el-date-table-cell__text {
  background: var(--el-color-primary, #0052d9);
  color: #fff;
  font-weight: 500;
}

.modern-date-range-popper .el-date-table td.start-date .el-date-table-cell,
.modern-date-range-popper .el-date-table td.end-date .el-date-table-cell {
  background: color-mix(in srgb, var(--el-color-primary, #0052d9) 8%, #fff);
}

.modern-date-range-popper .el-date-table td.disabled .el-date-table-cell__text {
  color: #ccc;
}

.modern-date-range-popper .el-picker-panel__footer {
  border-top: 1px solid #f0f0f0;
  padding: 8px 12px;
}

.modern-date-range-popper .el-picker-panel__link-btn {
  color: var(--el-color-primary, #0052d9);
  font-size: 13px;
}

.modern-date-range-popper .el-picker-panel__link-btn:hover {
  opacity: 0.8;
}
</style>

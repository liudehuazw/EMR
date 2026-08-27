<template>
  <div v-if="showToolbar" class="date-range-toolbar">
    <div class="toolbar-left">
      <div class="range-buttons">
        <button
          v-for="m in monthOptions"
          :key="m"
          type="button"
          :style="rangeBtnStyle(m, accentColor)"
          @click="$emit('set-range', m)"
        >
          {{ m === 0 ? '全部' : (m === 12 ? '近1年' : `近${m}个月`) }}
        </button>
      </div>
      <span v-if="showCount" class="count-hint">
        共 {{ filteredCount }}/{{ totalCount }} 份
      </span>
      <slot name="extra-filters" />
    </div>
    <div class="toolbar-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  showToolbar: { type: Boolean, default: true },
  monthOptions: { type: Array, default: () => [3, 6, 12, 0] },
  rangeBtnStyle: { type: Function, required: true },
  accentColor: { type: String, default: '#cc5c5c' },
  filteredCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  showCount: { type: Boolean, default: true }
});

defineEmits(['set-range']);
</script>

<style scoped>
.date-range-toolbar {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 10px 14px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.range-buttons { display: flex; gap: 4px; }
.count-hint { font-size: 12px; color: #999; }
.toolbar-actions { display: flex; gap: 6px; flex-wrap: wrap; }
</style>

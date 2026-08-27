<template>
  <div v-if="reports.length > 0" class="lab-report-list">
    <div v-if="bodyFluid.length > 0" class="report-group">
      <div class="group-title">💧 体液检验报告 ({{ bodyFluid.length }})</div>
      <div class="report-buttons">
        <div
          v-for="r in bodyFluid"
          :key="'bf-' + r.id"
          class="report-btn"
          :style="btnStyle(r.id, 'bodyFluid')"
          @click="$emit('select', r.id)"
        >
          {{ formatDate(r.date) }} {{ r.testName }}
        </div>
      </div>
    </div>
    <div v-if="blood.length > 0" class="report-group">
      <div class="group-title">🩸 血液检验报告 ({{ blood.length }})</div>
      <div class="report-buttons">
        <div
          v-for="r in blood"
          :key="'bl-' + r.id"
          class="report-btn"
          :style="btnStyle(r.id, 'blood')"
          @click="$emit('select', r.id)"
        >
          {{ formatDate(r.date) }} {{ r.testName }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatDate } from '@/utils/index';
import { splitReportsByFluid } from '@/composables/lab/useLabClassification';

const props = defineProps({
  reports: { type: Array, default: () => [] },
  selectedReportId: { type: [Number, String], default: null }
});

defineEmits(['select']);

const bodyFluid = computed(() => splitReportsByFluid(props.reports).bodyFluid);
const blood = computed(() => splitReportsByFluid(props.reports).blood);

const btnStyle = (id, type) => {
  const selected = props.selectedReportId === id;
  const fluid = type === 'bodyFluid';
  return {
    padding: '7px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    background: selected ? (fluid ? '#2e7d32' : '#cc5c5c') : (fluid ? '#e8f5e9' : '#fff5f5'),
    border: `1px solid ${selected ? (fluid ? '#2e7d32' : '#cc5c5c') : (fluid ? '#a5d6a7' : '#e8b4b4')}`,
    color: selected ? 'white' : (fluid ? '#2e7d32' : '#cc5c5c')
  };
};
</script>

<style scoped>
.report-group { margin-bottom: 1rem; }
.group-title { font-size: 12px; color: #666; margin-bottom: 6px; font-weight: 600; }
.report-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
</style>

<template>
  <div class="patient-tab-bar">
    <div
      v-for="p in patients"
      :key="`${moduleKey}-tab-${p.id}`"
      class="patient-tab"
      :class="{ active: activePatientId === p.id }"
      :style="tabStyle(p.id)"
      @click="$emit('select', p.id)"
    >
      {{ p.name }}
      <span v-if="getCount(p.id) > 0" class="tab-count">({{ getCount(p.id) }})</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  patients: { type: Array, required: true },
  activePatientId: { type: [Number, String], default: null },
  getCount: { type: Function, default: () => 0 },
  moduleKey: { type: String, default: 'module' },
  accentColor: { type: String, default: '#cc5c5c' }
});

defineEmits(['select']);

const tabStyle = (patientId) => ({
  padding: '7px 16px',
  borderRadius: '20px',
  cursor: 'pointer',
  fontSize: '13px',
  whiteSpace: 'nowrap',
  fontWeight: props.activePatientId === patientId ? '600' : '400',
  background: props.activePatientId === patientId ? props.accentColor : '#f5f5f5',
  color: props.activePatientId === patientId ? 'white' : '#555',
  border: `1px solid ${props.activePatientId === patientId ? props.accentColor : '#ddd'}`,
  transition: 'all 0.2s'
});
</script>

<style scoped>
.patient-tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 1.2rem;
  padding-bottom: 12px;
  border-bottom: 2px solid #eee;
}
.tab-count {
  font-size: 11px;
  opacity: 0.8;
  margin-left: 3px;
}
@media (max-width: 768px) {
  .patient-tab-bar {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .patient-tab-bar::-webkit-scrollbar { display: none; }
}
</style>

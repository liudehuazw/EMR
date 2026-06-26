import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiRequest } from '@/api/index';
import { useAuthStore } from './useAuth';

export const useRecordsStore = defineStore('records', () => {
  const authStore = useAuthStore();
  const medicalRecords = ref([]);
  const selectedRecord = ref(null);

  const _load = () => {
    const stored = localStorage.getItem('emr_medical_records');
    if (stored) {
      try { medicalRecords.value = JSON.parse(stored); } catch (e) { /* ignore */ }
    }
  };
  _load();

  const save = () => {
    if (authStore.isDemoMode) return;
    localStorage.setItem('emr_medical_records', JSON.stringify(medicalRecords.value));
  };

  const loadFromBackend = async (patients) => {
    if (authStore.isDemoMode) return;
    const all = [];
    for (const p of patients) {
      try {
        const res = await apiRequest(`/medical-records/patient/${p.id}`);
        if (res.code === 200 && res.data) {
          all.push(...res.data.map(r => ({
            id: r.id, backendId: r.id, patientId: r.patientId,
            date: r.visitDate, hospital: r.hospital || '',
            department: r.department || '', doctor: r.doctor || '',
            diagnosis: r.diagnosis || '', symptoms: r.symptoms || '',
            treatment: r.treatment || '', notes: r.notes || '',
            files: r.files ? (typeof r.files === 'string' ? JSON.parse(r.files) : r.files) : []
          })));
        }
      } catch (e) { console.warn(`[Records] Load failed for patient ${p.id}:`, e); }
    }
    medicalRecords.value = all;
    localStorage.setItem('emr_medical_records', JSON.stringify(all));
  };

  const getPatientRecords = (patientId) =>
    medicalRecords.value.filter(r => r.patientId === patientId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  const addRecord = async (record) => {
    medicalRecords.value.push(record);
    save();
    if (authStore.isDemoMode) return;
    try {
      const payload = {
        patientId: record.patientId,
        visitDate: record.date,
        hospital: record.hospital || '',
        department: record.department || '',
        doctor: record.doctor || '',
        diagnosis: record.diagnosis || '',
        symptoms: record.symptoms || '',
        treatment: record.treatment || '',
        notes: record.notes || '',
        files: JSON.stringify(Array.isArray(record.files) ? record.files : [])
      };
      const res = await apiRequest('/medical-records', { method: 'POST', body: JSON.stringify(payload) });
      if (res.code === 200 && res.data?.id) {
        const idx = medicalRecords.value.findIndex(r => r.id === record.id);
        if (idx !== -1) medicalRecords.value[idx].backendId = res.data.id;
        save();
        console.log('[Records] Synced to backend (POST):', res.data.id);
      }
    } catch (e) { console.warn('[Records] Backend sync failed:', e); }
  };

  const updateRecord = async (record) => {
    const idx = medicalRecords.value.findIndex(r => r.id === record.id);
    if (idx !== -1) { medicalRecords.value[idx] = { ...medicalRecords.value[idx], ...record }; save(); }
    if (authStore.isDemoMode || !record.backendId) return;
    try {
      const payload = {
        patientId: record.patientId,
        visitDate: record.date,
        hospital: record.hospital || '',
        department: record.department || '',
        doctor: record.doctor || '',
        diagnosis: record.diagnosis || '',
        symptoms: record.symptoms || '',
        treatment: record.treatment || '',
        notes: record.notes || '',
        files: JSON.stringify(Array.isArray(record.files) ? record.files : [])
      };
      await apiRequest(`/medical-records/${record.backendId}`, { method: 'PUT', body: JSON.stringify(payload) });
      console.log('[Records] Synced to backend (PUT):', record.backendId);
    } catch (e) { console.warn('[Records] Backend update failed:', e); }
  };

  return { medicalRecords, selectedRecord, save, loadFromBackend, getPatientRecords, addRecord, updateRecord };
});

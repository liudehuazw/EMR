import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  fetchMedicalRecordsByPatient,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord
} from '@/api/medical-records';
import { useAuthStore } from './useAuth';
import { mergeWithUnsyncedLocal, parseJsonField, samePatientId } from '@/utils/backendSync';

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

  const buildRecordPayload = (record) => ({
    patientId: Number(record.patientId),
    visitDate: record.date,
    hospital: record.hospital || '',
    department: record.department || '',
    doctor: record.doctor || '',
    diagnosis: record.diagnosis || '',
    symptoms: record.symptoms || '',
    treatment: record.treatment || '',
    notes: record.notes || '',
    files: JSON.stringify(Array.isArray(record.files) ? record.files : [])
  });

  const syncRecordToBackend = async (record) => {
    if (authStore.isDemoMode || record.backendId) return;
    try {
      const res = await createMedicalRecord(buildRecordPayload(record));
      if (res.code === 200 && res.data?.id) {
        const idx = medicalRecords.value.findIndex(r => r.id === record.id);
        if (idx !== -1) {
          medicalRecords.value[idx].backendId = res.data.id;
          medicalRecords.value[idx].id = res.data.id;
          save();
          console.log('[Records] Synced to backend (POST):', res.data.id);
        }
      }
    } catch (e) {
      console.warn('[Records] Backend sync failed:', e);
    }
  };

  const loadFromBackend = async (patients) => {
    if (authStore.isDemoMode) return;
    const previousLocal = [...medicalRecords.value];
    if (!patients?.length) {
      if (previousLocal.length > 0) {
        console.warn('[Records] No patients to load; keeping local medical records');
      }
      return;
    }
    const all = [];
    let failedPatients = 0;
    const chunks = await Promise.all(
      patients.map(async (p) => {
        try {
          const res = await fetchMedicalRecordsByPatient(p.id);
          if (res.code === 200 && res.data) {
            return {
              ok: true,
              rows: res.data.map(r => ({
                id: r.id, backendId: r.id, patientId: r.patientId,
                date: r.visitDate, hospital: r.hospital || '',
                department: r.department || '', doctor: r.doctor || '',
                diagnosis: r.diagnosis || '', symptoms: r.symptoms || '',
                treatment: r.treatment || '', notes: r.notes || '',
                files: parseJsonField(r.files, []) || []
              }))
            };
          }
          return { ok: false };
        } catch (e) {
          console.warn(`[Records] Load failed for patient ${p.id}:`, e);
          return { ok: false };
        }
      })
    );
    for (const c of chunks) {
      if (c.ok) all.push(...c.rows);
      else failedPatients += 1;
    }
    if (all.length === 0 && previousLocal.length > 0 && failedPatients === patients.length) {
      console.warn('[Records] All backend loads failed; keeping local cache');
      return;
    }
    const merged = mergeWithUnsyncedLocal(all, previousLocal);
    medicalRecords.value = merged;
    localStorage.setItem('emr_medical_records', JSON.stringify(merged));
    merged.filter((r) => !r.backendId).forEach((r) => { syncRecordToBackend(r); });
  };

  const getPatientRecords = (patientId) =>
    medicalRecords.value.filter(r => samePatientId(r.patientId, patientId))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  const resolveBackendId = (record) => {
    if (!record) return null;
    if (record.backendId != null && record.backendId !== '') {
      return Number(record.backendId);
    }
    const id = record.id;
    if (typeof id === 'number' && id > 0) return id;
    if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id);
    return null;
  };

  const removeLocalRecord = (record) => {
    const backendId = resolveBackendId(record);
    const before = medicalRecords.value.length;
    medicalRecords.value = medicalRecords.value.filter((r) => {
      if (r.id === record.id) return false;
      if (backendId != null && (Number(r.backendId) === backendId || Number(r.id) === backendId)) {
        return false;
      }
      return true;
    });
    if (medicalRecords.value.length === before) {
      throw new Error('本地未找到该病历');
    }
    save();
  };

  const deleteRecord = async (record) => {
    if (!record) throw new Error('记录不存在');
    if (authStore.isDemoMode) {
      removeLocalRecord(record);
      return;
    }
    const backendId = resolveBackendId(record);
    if (backendId) {
      const res = await deleteMedicalRecord(backendId);
      if (res.code !== 200) {
        throw new Error(res.message || '服务器删除失败');
      }
    }
    removeLocalRecord(record);
  };

  const addRecord = async (record) => {
    medicalRecords.value.push(record);
    save();
    await syncRecordToBackend(record);
  };

  const updateRecord = async (record) => {
    const idx = medicalRecords.value.findIndex(r => r.id === record.id);
    if (idx === -1) {
      throw new Error('记录不存在');
    }
    medicalRecords.value[idx] = { ...medicalRecords.value[idx], ...record };
    save();

    if (authStore.isDemoMode || !record.backendId) return;

    const payload = buildRecordPayload(record);
    updateMedicalRecord(record.backendId, payload)
      .then(() => console.log('[Records] Synced to backend (PUT):', record.backendId))
      .catch((e) => console.warn('[Records] Backend update failed:', e));
  };

  return { medicalRecords, selectedRecord, save, loadFromBackend, getPatientRecords, addRecord, updateRecord, deleteRecord };
});

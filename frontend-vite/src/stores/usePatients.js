import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { apiRequest } from '@/api/index';
import { useAuthStore } from './useAuth';
import { generateId } from '@/utils/index';

export const usePatientsStore = defineStore('patients', () => {
  const authStore = useAuthStore();
  const patients = reactive([]);

  const _load = () => {
    const stored = localStorage.getItem('emr_patients');
    if (stored) {
      try { patients.splice(0, patients.length, ...JSON.parse(stored)); } catch (e) { /* ignore */ }
    }
  };
  _load();

  // Only keep real URLs (http/https), filter out base64 data URLs
  const _extractUrl = (val) => (val && val.startsWith('http') ? val : '');

  const save = () => {
    if (authStore.isDemoMode) return;
    localStorage.setItem('emr_patients', JSON.stringify(patients));
  };

  const loadFromBackend = async () => {
    if (authStore.isDemoMode) return;
    const res = await apiRequest('/patients?page=1&size=9999');
    if (res.code === 200 && res.data?.records) {
      const list = res.data.records.map(p => ({
        id: p.id, patientNo: p.patientNo, name: p.name,
        gender: Number(p.gender), birthDate: p.birthDate,
        phone: p.phone, idCard: p.idCard, address: p.address,
        emergencyContact: p.emergencyContact, emergencyPhone: p.emergencyPhone,
        allergyHistory: p.allergyHistory, medicalHistory: p.medicalHistory,
        avatar: p.avatarUrl || '', avatarUrl: p.avatarUrl || ''
      }));
      patients.splice(0, patients.length, ...list);
      localStorage.setItem('emr_patients', JSON.stringify(patients));
    }
  };

  const addPatient = async (form) => {
    const patient = { ...form, id: generateId(), patientNo: `P${Date.now()}` };
    patients.push(patient);
    save();
    if (!authStore.isDemoMode) {
      try {
        const res = await apiRequest('/patients', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name, gender: form.gender, birthDate: form.birthDate,
            phone: form.phone, idCard: form.idCard, address: form.address,
            emergencyContact: form.emergencyContact, emergencyPhone: form.emergencyPhone,
            allergyHistory: form.allergyHistory, medicalHistory: form.medicalHistory
          })
        });
        if (res.code === 200 && res.data?.id) {
          patient.id = res.data.id;
          save();
        }
      } catch (e) { console.warn('[Patients] Backend create failed:', e); }
    }
    return patient;
  };

  const updatePatient = async (updatedPatient) => {
    const idx = patients.findIndex(p => p.id === updatedPatient.id);
    if (idx !== -1) { patients.splice(idx, 1, { ...updatedPatient }); save(); }
    if (!authStore.isDemoMode) {
      try {
        // Only send backend-expected fields (PatientForm DTO)
        const payload = {
          name: updatedPatient.name, gender: updatedPatient.gender,
          birthDate: updatedPatient.birthDate, phone: updatedPatient.phone,
          idCard: updatedPatient.idCard, address: updatedPatient.address,
          emergencyContact: updatedPatient.emergencyContact,
          emergencyPhone: updatedPatient.emergencyPhone,
          allergyHistory: updatedPatient.allergyHistory,
          medicalHistory: updatedPatient.medicalHistory,
          avatarUrl: _extractUrl(updatedPatient.avatarUrl || updatedPatient.avatar || '')
        };
        await apiRequest(`/patients/${updatedPatient.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } catch (e) { console.warn('[Patients] Backend update failed:', e); }
    }
  };

  const deletePatient = async (patientId) => {
    const idx = patients.findIndex(p => p.id === patientId);
    if (idx !== -1) { patients.splice(idx, 1); save(); }
    if (!authStore.isDemoMode) {
      try { await apiRequest(`/patients/${patientId}`, { method: 'DELETE' }); }
      catch (e) { console.warn('[Patients] Backend delete failed:', e); }
    }
  };

  const getPatientById = (id) => patients.find(p => p.id === id || p.id === Number(id));

  return { patients, loadFromBackend, addPatient, updatePatient, deletePatient, getPatientById };
});

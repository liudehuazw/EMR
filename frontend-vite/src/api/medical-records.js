import { apiRequest } from './client';

export function fetchMedicalRecordsByPatient(patientId) {
  return apiRequest(`/medical-records/patient/${patientId}`);
}

export function createMedicalRecord(payload) {
  return apiRequest('/medical-records', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateMedicalRecord(id, payload) {
  return apiRequest(`/medical-records/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteMedicalRecord(id) {
  return apiRequest(`/medical-records/${id}`, { method: 'DELETE' });
}

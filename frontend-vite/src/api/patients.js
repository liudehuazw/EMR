import { apiRequest } from './client';

export function fetchPatients(page = 1, size = 9999) {
  return apiRequest(`/patients?page=${page}&size=${size}`);
}

export function createPatient(payload) {
  return apiRequest('/patients', { method: 'POST', body: JSON.stringify(payload) });
}

export function updatePatient(id, payload) {
  return apiRequest(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deletePatient(id) {
  return apiRequest(`/patients/${id}`, { method: 'DELETE' });
}

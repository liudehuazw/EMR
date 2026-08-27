import { apiRequest } from './client';

export function fetchLabReportsByPatient(patientId) {
  return apiRequest(`/lab-reports/patient/${patientId}`);
}

export function createLabReport(payload) {
  return apiRequest('/lab-reports', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateLabReport(id, payload) {
  return apiRequest(`/lab-reports/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteLabReport(id) {
  return apiRequest(`/lab-reports/${id}`, { method: 'DELETE' });
}

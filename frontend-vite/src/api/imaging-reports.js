import { apiRequest } from './client';

export function fetchImagingReportsByPatient(patientId) {
  return apiRequest(`/imaging-reports/patient/${patientId}`);
}

export function createImagingReport(payload) {
  return apiRequest('/imaging-reports', { method: 'POST', body: JSON.stringify(payload) });
}

export function deleteImagingReport(id) {
  return apiRequest(`/imaging-reports/${id}`, { method: 'DELETE' });
}

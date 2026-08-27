import { apiRequest } from './client';

export function fetchInvoicesByPatient(patientId) {
  return apiRequest(`/invoices/patient/${patientId}`);
}

export function createInvoice(payload) {
  return apiRequest('/invoices', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateInvoice(id, payload) {
  return apiRequest(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteInvoice(id) {
  return apiRequest(`/invoices/${id}`, { method: 'DELETE' });
}

import { apiRequest } from './client';

export function getStorageType() {
  return apiRequest('/system/config/storage');
}

export function setStorageType(storageType) {
  return apiRequest('/system/config/storage', {
    method: 'PUT',
    body: JSON.stringify({ storageType })
  });
}

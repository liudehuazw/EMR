import { useAuthStore } from '@/stores/useAuth';

// Auto-detect API base URL
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080/api'
  : `${window.location.protocol}//${window.location.host}/api`;

export { API_BASE_URL };

/**
 * Generic authenticated API request wrapper
 * @param {string} path - API path (e.g. '/patients')
 * @param {RequestInit} options - fetch options
 * @returns {Promise<any>} parsed JSON response
 */
export const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem('emr_token');
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData) && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem('emr_token');
    localStorage.removeItem('emr_user_info');
    const authStore = useAuthStore();
    authStore.logout();
    throw new Error('认证过期');
  }
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || `请求失败: ${response.status}`);
  }
  return response.json();
};

/**
 * Upload file to cloud OSS via backend
 * @param {File} file
 * @param {string} folder
 * @returns {Promise<string>} OSS URL
 */
export const uploadFileToCloud = async (file, folder = 'uploads') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const token = localStorage.getItem('emr_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/files/upload`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    throw new Error(`上传失败: ${response.status}`);
  }
  const result = await response.json();
  if (result.code !== 200) {
    throw new Error(result.message || '上传失败');
  }
  return result.data.url;
};

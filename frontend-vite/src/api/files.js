import { API_BASE_URL } from './client';

/**
 * Upload file to cloud OSS via backend
 * @param {File} file
 * @param {string} folder
 * @returns {Promise<string>} OSS URL
 */
export async function uploadFileToCloud(file, folder = 'uploads') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const token = localStorage.getItem('emr_token');
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

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
}

import { API_BASE_URL } from './client';

/**
 * @param {string} username
 * @param {string} password
 */
export async function loginApi(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 502 || response.status === 504) {
      throw new Error('网关错误(502/504)：Java 后端未响应，请在服务器检查 emr-backend 是否启动');
    }
    try {
      const errJson = JSON.parse(text);
      throw new Error(errJson.message || `登录失败 HTTP ${response.status}`);
    } catch (e) {
      if (e.message && e.message.includes('网关')) throw e;
      throw new Error(`登录失败 HTTP ${response.status}，服务器未返回 JSON`);
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('登录响应格式异常，请检查后端服务与 Nginx 代理');
  }
}

/**
 * @param {string} oldPassword
 * @param {string} newPassword
 */
export async function changePasswordApi(oldPassword, newPassword) {
  const token = localStorage.getItem('emr_token');
  const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ oldPassword, newPassword })
  });
  return response.json();
}

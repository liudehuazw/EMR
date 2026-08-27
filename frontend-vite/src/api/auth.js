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
  return response.json();
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

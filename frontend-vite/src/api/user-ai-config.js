import { apiRequest } from './client';

export function getUserAiConfig() {
  return apiRequest('/user/ai-config');
}

export function saveUserAiConfig(config) {
  return apiRequest('/user/ai-config', {
    method: 'PUT',
    body: JSON.stringify(config)
  });
}

export function testUserAiConfig(config) {
  return apiRequest('/user/ai-config/test', {
    method: 'POST',
    body: JSON.stringify(config)
  });
}

import { apiRequest, API_BASE_URL } from './client';
import { useAuthStore } from '@/stores/useAuth';

/**
 * @param {{ type: string, data: string, title?: string, patientName?: string }} payload
 */
export function analyzeWithAi(payload) {
  return apiRequest('/ai/analyze', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * SSE streaming chat with the AI data assistant.
 *
 * @param {{ message: string, history?: Array, contextPatientId?: number|null }} payload
 * @param {{
 *   signal?: AbortSignal,
 *   onDelta?: (text: string) => void,
 *   onTool?: (name: string, status: 'start'|'done') => void,
 *   onSources?: (sources: Array) => void,
 *   onDone?: () => void,
 *   onError?: (message: string) => void
 * }} handlers
 * @returns {Promise<void>}
 */
export async function chatWithAssistant(payload, handlers = {}) {
  const { signal, onDelta, onTool, onSources, onDone, onError } = handlers;

  const token = localStorage.getItem('emr_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: payload.message,
      history: payload.history || [],
      contextPatientId: payload.contextPatientId ?? null
    }),
    signal
  });

  if (res.status === 401) {
    localStorage.removeItem('emr_token');
    localStorage.removeItem('emr_user_info');
    useAuthStore().logout();
    throw new Error('认证过期');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `请求失败: ${res.status}`);
  }
  if (!res.body) throw new Error('无响应');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of chunk.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (!data) continue;
          let evt;
          try { evt = JSON.parse(data); } catch { continue; }
          switch (evt.type) {
            case 'delta': onDelta?.(evt.content); break;
            case 'tool': onTool?.(evt.name, evt.status); break;
            case 'sources': onSources?.(evt.sources); break;
            case 'done': onDone?.(); return;
            case 'error': onError?.(evt.message); return;
          }
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
}

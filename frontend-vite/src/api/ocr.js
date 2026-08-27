import { API_BASE_URL } from './client';

const DEFAULT_OCR_TIMEOUT_MS = 720000;

/**
 * Process file with OCR service
 * @param {File} file
 * @param {{ maxRetries?: number, timeoutMs?: number }} options
 */
export async function processOcrFile(file, options = {}) {
  const { maxRetries = 1, timeoutMs = DEFAULT_OCR_TIMEOUT_MS } = options;
  const token = localStorage.getItem('emr_token');
  const formData = new FormData();
  formData.append('file', file);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(`${API_BASE_URL}/ocr/process`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`OCR HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'OCR失败');
      return data.data;
    } catch (err) {
      const isTimeout = err.name === 'AbortError' || (err.message && err.message.includes('504'));
      if (!isTimeout && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

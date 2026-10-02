import { API_BASE_URL } from '@/api/client';

const LOCAL_PREVIEW_PREFIX = '/files/preview/';

export function isLocalPreviewUrl(fileUrl) {
  if (!fileUrl) return false;
  const path = toPathname(fileUrl);
  return path.includes(LOCAL_PREVIEW_PREFIX);
}

function toPathname(fileUrl) {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    try {
      return new URL(fileUrl).pathname;
    } catch {
      return fileUrl;
    }
  }
  return fileUrl;
}

/** Build API URL for local preview (optional ?token= for img/iframe; prefer fetch + Bearer). */
export function resolvePreviewUrl(fileUrl) {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('data:')) return fileUrl;
  if ((fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) && !isLocalPreviewUrl(fileUrl)) {
    return fileUrl;
  }
  const token = localStorage.getItem('emr_token');
  const fetchUrl = buildLocalPreviewFetchUrl(fileUrl);
  if (!token) return fetchUrl;
  const sep = fetchUrl.includes('?') ? '&' : '?';
  return `${fetchUrl}${sep}token=${encodeURIComponent(token)}`;
}

export function buildLocalPreviewFetchUrl(fileUrl) {
  let path = toPathname(fileUrl);
  if (path.startsWith('/api/')) {
    path = path.substring(4);
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}

/**
 * Load preview URL for display: OSS/https direct; local files via authenticated fetch → blob: URL.
 * @returns {{ url: string, revoke: () => void }}
 */
export async function loadPreviewDisplayUrl(fileUrl) {
  const noop = () => {};
  if (!fileUrl || fileUrl === '#') {
    return { url: '', revoke: noop };
  }
  if (fileUrl.startsWith('data:')) {
    return { url: fileUrl, revoke: noop };
  }
  if ((fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) && !isLocalPreviewUrl(fileUrl)) {
    return { url: fileUrl, revoke: noop };
  }

  const token = localStorage.getItem('emr_token');
  const fetchUrl = buildLocalPreviewFetchUrl(fileUrl);
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(fetchUrl, { headers });
  if (!response.ok) {
    const hint = response.status === 404
      ? '文件在服务器上不存在（请检查 FILE_UPLOAD_PATH 与 Nginx /api/ 代理）'
      : `HTTP ${response.status}`;
    throw new Error(hint);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  return { url: objectUrl, revoke: () => URL.revokeObjectURL(objectUrl) };
}

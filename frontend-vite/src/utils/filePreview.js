import { API_BASE_URL } from '@/api/client';

const LOCAL_PREVIEW_PREFIX = '/files/preview/';

export function isLocalPreviewUrl(fileUrl) {
  if (!fileUrl) return false;
  return fileUrl.startsWith(LOCAL_PREVIEW_PREFIX)
    || fileUrl.startsWith(`${API_BASE_URL}${LOCAL_PREVIEW_PREFIX}`);
}

export function resolvePreviewUrl(fileUrl) {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('data:')) {
    return fileUrl;
  }
  const token = localStorage.getItem('emr_token');
  let path = fileUrl;
  if (path.startsWith('/api/')) {
    path = path.substring(4);
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  const base = path.startsWith(LOCAL_PREVIEW_PREFIX)
    ? `${API_BASE_URL}${path}`
    : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!token) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}token=${encodeURIComponent(token)}`;
}

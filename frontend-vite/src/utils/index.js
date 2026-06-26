/**
 * Format date string to YYYY-MM-DD
 * @param {string|Array} dateVal - 日期字符串或 Jackson 序列化的 LocalDate 数组 [year, month, day]
 * @returns {string}
 */
export const formatDate = (dateVal) => {
  if (!dateVal) return '';
  // 【修复】处理 Jackson 序列化的 LocalDate 数组 [year, month, day]
  if (Array.isArray(dateVal) && dateVal.length >= 3) {
    const [y, m, d] = dateVal;
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  const dateStr = String(dateVal);
  // 【修复】如果已经是 YYYY-MM-DD 格式，直接返回
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // 尝试从其他格式解析（如 YYYY/MM/DD 或 2026年02月04日）
  const m = dateStr.match(/(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  }
  // 使用 Date 对象作为后备
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
};

/**
 * Format file size bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/**
 * Show a global message toast using Element Plus ElMessage
 * @param {string} text
 * @param {'success'|'warning'|'error'|'info'} type
 */
export const showMessage = (text, type = 'info') => {
  // Dynamic import to avoid circular deps; ElMessage is globally available via app.use(ElementPlus)
  const typeMap = { success: 'success', warning: 'warning', error: 'error', info: 'info' };
  const elType = typeMap[type] || 'info';
  if (window.__elMessage) {
    window.__elMessage({ message: text, type: elType, duration: 3000 });
  }
};

/**
 * Generate a unique local ID (timestamp + random)
 * @returns {string}
 */
export const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Deep clone a plain object/array
 * @param {any} obj
 * @returns {any}
 */
export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Debounce a function
 * @param {Function} fn
 * @param {number} delay ms
 * @returns {Function}
 */
export const debounce = (fn, delay = 300) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

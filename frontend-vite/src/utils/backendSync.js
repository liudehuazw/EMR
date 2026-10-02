/**
 * Safe helpers when syncing Pinia + localStorage with backend APIs.
 */

export function parseJsonField(value, fallback = null) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    console.warn('[backendSync] JSON parse failed:', e);
    return fallback;
  }
}

/** Match records across local/backend (patientId may be number or string). */
export function samePatientId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/**
 * Keep local rows that were never synced (no backendId) so refresh does not wipe them.
 */
export function mergeWithUnsyncedLocal(backendRows, localRows) {
  const merged = [...backendRows];
  for (const local of localRows) {
    if (local.backendId) continue;
    const duplicated = backendRows.some(
      (b) => b.id === local.id || (b.backendId && b.backendId === local.backendId)
    );
    if (!duplicated) merged.push(local);
  }
  return merged;
}

export function shouldReplacePatientListFromBackend(apiTotal, localCount) {
  const total = Number(apiTotal);
  if (!Number.isFinite(total) || total > 0) return true;
  return localCount === 0;
}

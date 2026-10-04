import { ref } from 'vue';

const LAST_FULL_SYNC_KEY = 'emr_last_full_sync_at';
/** 刷新页面时，距上次全量同步不足该间隔则不再请求（仍可用 force 强制） */
export const REFRESH_SYNC_MIN_INTERVAL_MS = 120_000;

/** 仅「无本地患者且首次拉取」时显示全屏 loading */
export const backendSyncVisible = ref(false);

/** @deprecated 使用 backendSyncVisible */
export const backendSyncInProgress = backendSyncVisible;

let syncInFlight = null;

function touchLastFullSync() {
  try {
    localStorage.setItem(LAST_FULL_SYNC_KEY, String(Date.now()));
  } catch (_) { /* ignore quota */ }
}

export function shouldSkipBackgroundRefreshSync(force = false) {
  if (force) return false;
  try {
    const last = Number(localStorage.getItem(LAST_FULL_SYNC_KEY) || 0);
    if (!last) return false;
    return Date.now() - last < REFRESH_SYNC_MIN_INTERVAL_MS;
  } catch (_) {
    return false;
  }
}

async function syncDetailsFromBackend(stores, patients) {
  const { recordsStore, labStore, imagingStore, invoiceStore } = stores;
  if (!patients?.length) return;
  await Promise.all([
    recordsStore.loadFromBackend(patients),
    labStore.loadFromBackend(patients),
    imagingStore.loadFromBackend(patients),
    invoiceStore.loadFromBackend(patients)
  ]);
}

/**
 * @param {object} stores pinia stores + authStore
 * @param {{ force?: boolean, mode?: 'background' | 'interactive' }} options
 *   - background：不挡界面；有本地患者时与患者列表并行拉明细
 *   - interactive：仅在没有本地患者时，在拉取患者列表阶段显示 loading
 */
export async function syncAllFromBackend(stores, options = {}) {
  const { force = false, mode = 'background' } = options;
  const { authStore, patientsStore } = stores;

  if (authStore?.isDemoMode) return;
  if (!force && shouldSkipBackgroundRefreshSync(false)) return;
  if (syncInFlight) return syncInFlight;

  const run = async () => {
    const cachedPatients = [...patientsStore.patients];
    const showBlock = mode === 'interactive' && cachedPatients.length === 0;

    if (showBlock) backendSyncVisible.value = true;

    try {
      if (cachedPatients.length === 0) {
        await patientsStore.loadFromBackend();
        backendSyncVisible.value = false;
        await syncDetailsFromBackend(stores, patientsStore.patients);
      } else {
        // 有缓存：患者列表与明细并行，缩短总耗时且不遮罩
        backendSyncVisible.value = false;
        await Promise.all([
          patientsStore.loadFromBackend(),
          syncDetailsFromBackend(stores, cachedPatients)
        ]);
      }
      touchLastFullSync();
    } catch (e) {
      backendSyncVisible.value = false;
      throw e;
    }
  };

  syncInFlight = run().finally(() => {
    syncInFlight = null;
    backendSyncVisible.value = false;
  });
  return syncInFlight;
}

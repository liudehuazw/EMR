import { ref } from 'vue';

/** 全量从后端拉取业务数据时置 true，供患者页等展示 loading */
export const backendSyncInProgress = ref(false);

/**
 * 登录后或刷新后同步：先患者，再病历/检验/影像/发票并行。
 * 不阻塞路由跳转；调用方应在跳转后再 fire-and-forget 或 await 按需使用。
 */
export async function syncAllFromBackend(stores) {
  const {
    authStore,
    patientsStore,
    recordsStore,
    labStore,
    imagingStore,
    invoiceStore
  } = stores;

  if (authStore?.isDemoMode) return;

  backendSyncInProgress.value = true;
  try {
    await patientsStore.loadFromBackend();
    await Promise.all([
      recordsStore.loadFromBackend(patientsStore.patients),
      labStore.loadFromBackend(patientsStore.patients),
      imagingStore.loadFromBackend(patientsStore.patients),
      invoiceStore.loadFromBackend(patientsStore.patients)
    ]);
  } finally {
    backendSyncInProgress.value = false;
  }
}

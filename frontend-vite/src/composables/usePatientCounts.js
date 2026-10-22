import { ref, computed, watch } from 'vue';
import { fetchPatientCounts } from '@/api/patient-summary';

/** localStorage 缓存 key：刷新页面时先用缓存秒出数字，再用接口结果覆盖 */
const CACHE_KEY = 'emr_patient_counts_v1';
/** 缓存有效期：超过则视为过期，仍会展示但后台立即刷新 */
const CACHE_TTL_MS = 30 * 60 * 1000;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.at) return {};
    if (Date.now() - parsed.at > CACHE_TTL_MS) return {};
    return parsed.data && typeof parsed.data === 'object' ? parsed.data : {};
  } catch (_) {
    return {};
  }
}

function writeCache(map) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: map }));
  } catch (_) { /* quota / 隐私模式忽略 */ }
}

/**
 * 患者列表页各模块数量统计。
 *
 * 关键点：数字**不再**依赖 recordsStore / labStore 等本地全量数据。
 * 那些 store 需要把全部病历、检验、影像、发票拉完才能算出 .length，
 * 在移动/外网高延迟下要等几十秒，这正是"卡片数字显示很慢"的根因。
 *
 * 现在改为调用 /patient-summary/counts：
 *   1. 命中 localStorage 缓存 → 立即渲染（刷新页面时几乎零等待）
 *   2. 一次轻量请求拿到全部患者的 4 类数量 → 覆盖缓存
 *
 * @param {import('vue').Ref<Array>} patientsRef 患者列表 ref（通常为 computed）
 * @param {boolean} isDemoMode 演示模式不请求后端
 */
export function usePatientCounts(patientsRef, isDemoMode = false) {
  const counts = ref(readCache());
  const loading = ref(false);
  const error = ref('');

  const patientIds = () => (patientsRef.value || []).map(p => p.id).filter(id => id != null);

  async function refresh() {
    if (isDemoMode) return;
    const ids = patientIds();
    if (ids.length === 0) return;
    loading.value = true;
    error.value = '';
    try {
      const res = await fetchPatientCounts(ids);
      if (res?.code === 200 && Array.isArray(res.data)) {
        const next = {};
        for (const row of res.data) {
          if (row?.patientId == null) continue;
          next[String(row.patientId)] = {
            records: row.records || 0,
            lab: row.lab || 0,
            imaging: row.imaging || 0,
            invoice: row.invoice || 0
          };
        }
        counts.value = next;
        writeCache(next);
      }
    } catch (e) {
      // 统计失败不影响主流程：保留缓存值，页面照常可用
      error.value = e?.message || '统计加载失败';
      console.warn('[PatientCounts] load failed:', e);
    } finally {
      loading.value = false;
    }
  }

  // 患者列表就绪 / 增删改后自动刷新。
  // 注意：patientsStore.patients 是 reactive([]) 且用 splice 原地更新，引用始终不变，
  // 因此不能 watch 数组本身，而要 watch「id 序列」——患者增删时字符串变化才会触发。
  const idSignature = computed(() =>
    (patientsRef.value || []).map(p => p.id).filter(id => id != null).join(',')
  );

  watch(idSignature, (sig) => {
    if (sig) refresh();
  }, { immediate: true });

  /** 局部增减：上传/删除数据后无需等接口，数字立刻变化 */
  function bump(patientId, type, delta = 1) {
    if (patientId == null || !type) return;
    const key = String(patientId);
    const cur = counts.value[key] || { records: 0, lab: 0, imaging: 0, invoice: 0 };
    const next = { ...cur, [type]: Math.max(0, (cur[type] || 0) + delta) };
    counts.value = { ...counts.value, [key]: next };
    writeCache(counts.value);
  }

  /** 取某个患者某模块数量；未加载到则回退到本地 store 计数 */
  function getCount(type, patientId, fallback = () => 0) {
    const hit = counts.value[String(patientId)];
    if (hit && typeof hit[type] === 'number') return hit[type];
    return fallback();
  }

  return { counts, loading, error, refresh, bump, getCount };
}

import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { fetchImagingReportsByPatient } from '@/api/imaging-reports';
import { useAuthStore } from './useAuth';
import { mergeWithUnsyncedLocal, samePatientId } from '@/utils/backendSync';

export const useImagingStore = defineStore('imaging', () => {
  const authStore = useAuthStore();

  const _loadRaw = () => {
    const stored = localStorage.getItem('emr_imaging_reports');
    if (!stored) return [];
    try { return JSON.parse(stored); } catch (e) { return []; }
  };

  const imagingReports = reactive(_loadRaw());
  const activePatientId = ref(null);
  const selectedReportId = ref(null);
  const aiLoading = ref(false);
  const aiResult = ref('');
  const aiError = ref('');
  const filterDateStart = ref('');
  const filterDateEnd = ref('');
  const dateRangeMonths = ref(0);

  const save = () => {
    if (authStore.isDemoMode) return;
    try {
      localStorage.setItem('emr_imaging_reports', JSON.stringify(imagingReports));
    } catch (e) { console.warn('[Imaging] Save failed:', e); }
  };

  const loadFromBackend = async (patients) => {
    if (authStore.isDemoMode) return;
    const previousLocal = [...imagingReports];
    if (!patients?.length) {
      if (previousLocal.length > 0) {
        console.warn('[Imaging] No patients to load; keeping local imaging reports');
      }
      return;
    }
    const all = [];
    let failedPatients = 0;
    const chunks = await Promise.all(
      patients.map(async (p) => {
        try {
          const res = await fetchImagingReportsByPatient(p.id);
          if (res.code === 200 && res.data) {
            return {
              ok: true,
              rows: res.data.map(r => ({
                ...r,
                backendId: r.id,
                date: r.reportDate || r.date
              }))
            };
          }
          return { ok: false };
        } catch (e) {
          console.warn(`[Imaging] Load failed for patient ${p.id}:`, e);
          return { ok: false };
        }
      })
    );
    for (const c of chunks) {
      if (c.ok) all.push(...c.rows);
      else failedPatients += 1;
    }
    if (all.length === 0 && previousLocal.length > 0 && failedPatients === patients.length) {
      console.warn('[Imaging] All backend loads failed; keeping local cache');
      return;
    }
    const merged = mergeWithUnsyncedLocal(all, previousLocal);
    imagingReports.splice(0, imagingReports.length, ...merged);
    save();
  };

  const getPatientReports = (patientId) =>
    imagingReports.filter(r => samePatientId(r.patientId, patientId))
      .map(r => ({ ...r, date: r.date || r.reportDate })) // 【修复】兼容旧数据
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  const getReportById = (id) => imagingReports.find(r => r.id === id);

  const addReport = (report) => { imagingReports.push(report); save(); };
  const updateReport = (updated) => {
    const idx = imagingReports.findIndex(r => r.id === updated.id);
    if (idx !== -1) { imagingReports.splice(idx, 1, updated); save(); }
  };
  const deleteReport = (id) => {
    const idx = imagingReports.findIndex(r => r.id === id);
    if (idx !== -1) { imagingReports.splice(idx, 1); save(); }
  };

  return {
    imagingReports, activePatientId, selectedReportId,
    aiLoading, aiResult, aiError,
    filterDateStart, filterDateEnd, dateRangeMonths,
    save, loadFromBackend, getPatientReports, getReportById,
    addReport, updateReport, deleteReport
  };
});

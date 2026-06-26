import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { apiRequest } from '@/api/index';
import { useAuthStore } from './useAuth';

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
    const all = [];
    for (const p of patients) {
      try {
        const res = await apiRequest(`/imaging-reports/patient/${p.id}`);
        if (res.code === 200 && res.data) {
          // 【修复】后端返回reportDate，映射为前端date
          all.push(...res.data.map(r => ({
            ...r,
            backendId: r.id,              // 关键：映射后端id到backendId，避免重复POST
            date: r.reportDate || r.date
          })));
        }
      } catch (e) { console.warn(`[Imaging] Load failed for patient ${p.id}:`, e); }
    }
    imagingReports.splice(0, imagingReports.length, ...all);
    save();
  };

  const getPatientReports = (patientId) =>
    imagingReports.filter(r => r.patientId === patientId)
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

import { defineStore } from 'pinia';
import { reactive, ref, computed } from 'vue';
import { apiRequest } from '@/api/index';
import { useAuthStore } from './useAuth';

export const useLabStore = defineStore('lab', () => {
  const authStore = useAuthStore();

  // Migrate old format
  const _loadRaw = () => {
    const stored = localStorage.getItem('emr_lab_reports');
    if (!stored) return [];
    try {
      const data = JSON.parse(stored);
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  };

  const labReports = reactive(_loadRaw());
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
      localStorage.setItem('emr_lab_reports', JSON.stringify(labReports));
    } catch (e) { console.warn('[Lab] Save to localStorage failed:', e); }
  };

  const loadFromBackend = async (patients) => {
    if (authStore.isDemoMode) return;
    const all = [];
    for (const p of patients) {
      try {
        const res = await apiRequest(`/lab-reports/patient/${p.id}`);
        if (res.code === 200 && res.data) {
          all.push(...res.data.map(r => ({
            ...r,
            backendId: r.id,              // 关键：映射后端id到backendId，避免重复POST
            date: r.reportDate || r.date,
            tableData: r.tableData ? (typeof r.tableData === 'string' ? JSON.parse(r.tableData) : r.tableData) : []
          })));
        }
      } catch (e) { console.warn(`[Lab] Load failed for patient ${p.id}:`, e); }
    }
    labReports.splice(0, labReports.length, ...all);
    save();
  };

  const getPatientReports = (patientId) =>
    labReports.filter(r => r.patientId === patientId)
      .map(r => ({ ...r, date: r.date || r.reportDate })) // 【修复】兼容旧数据，确保date字段存在
      .sort((a, b) => new Date(a.date) - new Date(b.date));

  const getReportById = (id) => labReports.find(r => r.id === id);

  const addReport = async (report) => {
    labReports.push(report);
    save();
    if (!authStore.isDemoMode) {
      try {
        const payload = {
          patientId: report.patientId,
          reportDate: report.date,
          testName: report.testName,
          fileUrl: report.fileUrl,
          fileName: report.fileName,
          fileType: report.fileType,
          ocrRawText: report.ocrRawText,
          ocrConfidence: report.ocrConfidence,
          tableData: JSON.stringify(Array.isArray(report.tableData) ? report.tableData : [])
        };
        const res = await apiRequest('/lab-reports', { method: 'POST', body: JSON.stringify(payload) });
        if (res.code === 200 && res.data?.id) {
          const idx = labReports.findIndex(r => r.id === report.id);
          if (idx !== -1) labReports[idx].backendId = res.data.id;
          save();
        }
      } catch (e) { console.warn('[Lab] Sync to backend failed:', e); }
    }
  };

  const updateReport = async (updated) => {
    const idx = labReports.findIndex(r => r.id === updated.id);
    if (idx !== -1) { labReports.splice(idx, 1, updated); save(); }
    if (!authStore.isDemoMode && updated.backendId) {
      try {
        const payload = {
          patientId: updated.patientId,
          reportDate: updated.date,
          testName: updated.testName,
          fileUrl: updated.fileUrl,
          fileName: updated.fileName,
          fileType: updated.fileType,
          ocrRawText: updated.ocrRawText,
          ocrConfidence: updated.ocrConfidence,
          aiAnalysis: updated.aiAnalysis,
          tableData: JSON.stringify(Array.isArray(updated.tableData) ? updated.tableData : [])
        };
        await apiRequest(`/lab-reports/${updated.backendId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } catch (e) { console.warn('[Lab] Update backend failed:', e); }
    }
  };

  const deleteReport = async (reportId) => {
    const idx = labReports.findIndex(r => r.id === reportId);
    if (idx !== -1) {
      const bid = labReports[idx].backendId;
      if (bid) {
        try { await apiRequest(`/lab-reports/${bid}`, { method: 'DELETE' }); } catch (e) { console.warn('[Lab] Delete from backend failed:', e); }
      }
      labReports.splice(idx, 1);
      save();
    }
  };

  return {
    labReports, activePatientId, selectedReportId,
    aiLoading, aiResult, aiError,
    filterDateStart, filterDateEnd, dateRangeMonths,
    save, loadFromBackend, getPatientReports, getReportById,
    addReport, updateReport, deleteReport
  };
});

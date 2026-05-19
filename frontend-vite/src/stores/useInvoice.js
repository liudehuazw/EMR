import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { apiRequest } from '@/api/index';
import { useAuthStore } from './useAuth';

export const useInvoiceStore = defineStore('invoice', () => {
  const authStore = useAuthStore();

  const _loadRaw = () => {
    const stored = localStorage.getItem('emr_invoices');
    if (!stored) return [];
    try { return JSON.parse(stored); } catch (e) { return []; }
  };

  const invoices = reactive(_loadRaw());
  const activePatientId = ref(null);
  const filterDateStart = ref('');
  const filterDateEnd = ref('');
  const dateRangeMonths = ref(0);

  const save = () => {
    if (authStore.isDemoMode) return;
    try {
      localStorage.setItem('emr_invoices', JSON.stringify(invoices));
    } catch (e) {
      // localStorage quota 超限时，剥离 fileUrl 降级存储（fileUrl 来自云端OSS，可重新获取）
      try {
        const slim = invoices.map(({ fileUrl, ...rest }) => rest);
        localStorage.setItem('emr_invoices', JSON.stringify(slim));
        console.warn('[Invoice] Storage quota exceeded, saved without fileUrl');
      } catch (e2) { console.warn('[Invoice] Save failed even after stripping fileUrl:', e2); }
    }
  };

  const syncInvoiceToBackend = async (invoice) => {
    if (authStore.isDemoMode) return;
    try {
      const payload = {
        patientId: invoice.patientId,
        invoiceDate: invoice.date,
        title: invoice.title || '',
        fileName: invoice.fileName || '',
        fileType: invoice.fileType || '',
        fileUrl: invoice.fileUrl || '',
        totalAmount: invoice.totalAmount || 0,
        selfPayAmount: invoice.selfPayAmount || '',
        insuranceAmount: invoice.insuranceAmount || '',
        items: JSON.stringify(Array.isArray(invoice.items) ? invoice.items : []),
        ocrRawText: invoice.ocrRawText || ''
      };
      if (invoice.backendId) {
        // 已有后端记录 → PUT 更新
        await apiRequest(`/invoices/${invoice.backendId}`, { method: 'PUT', body: JSON.stringify(payload) });
        console.log('[Invoice] Synced to backend (PUT):', invoice.backendId);
      } else {
        // 无后端记录 → POST 注册，并回写 backendId
        const res = await apiRequest('/invoices', { method: 'POST', body: JSON.stringify(payload) });
        if (res.code === 200 && res.data?.id) {
          const idx = invoices.findIndex(i => i.id === invoice.id);
          if (idx !== -1) invoices[idx].backendId = res.data.id;
          console.log('[Invoice] Registered to backend (POST):', res.data.id);
        }
      }
    } catch (e) { console.warn('[Invoice] Backend sync failed:', e); }
  };

  const loadFromBackend = async (patients) => {
    if (authStore.isDemoMode) return;
    const all = [];
    for (const p of patients) {
      try {
        const res = await apiRequest(`/invoices/patient/${p.id}`);
        if (res.code === 200 && res.data) {
          // 【修复】解析可能为JSON字符串的items字段，并映射日期和文件URL字段
          all.push(...res.data.map(r => ({
            ...r,
            backendId: r.id,              // 关键：映射后端id到backendId，避免重复POST
            date: r.invoiceDate || r.date,
            fileUrl: r.fileUrl || r.file_url,
            ocrRawText: r.ocrRawText || r.ocr_raw_text || '',
            items: r.items ? (typeof r.items === 'string' ? JSON.parse(r.items) : r.items) : []
          })));
        }
      } catch (e) { console.warn(`[Invoice] Load failed for patient ${p.id}:`, e); }
    }
    invoices.splice(0, invoices.length, ...all);
    save();
  };

  const getPatientInvoices = (patientId) =>
    invoices.filter(inv => inv.patientId === patientId)
      .map(inv => ({ 
        ...inv, 
        date: inv.date || inv.invoiceDate, // 【修复】兼容旧数据日期字段
        fileUrl: inv.fileUrl || inv.file_url // 【修复】兼容旧数据文件链接字段
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  const addInvoice = async (invoice) => {
    invoices.push(invoice);
    save();
    await syncInvoiceToBackend(invoice);
  };
  const updateInvoice = (updated) => {
    const idx = invoices.findIndex(i => i.id === updated.id);
    if (idx !== -1) {
      invoices.splice(idx, 1, updated);
      save();
      syncInvoiceToBackend(updated);
    }
  };
  const deleteInvoice = async (id) => {
    const idx = invoices.findIndex(i => i.id === id);
    if (idx !== -1) {
      const bid = invoices[idx].backendId;
      if (bid) {
        try { await apiRequest(`/invoices/${bid}`, { method: 'DELETE' }); } catch (e) { console.warn('[Invoice] Delete from backend failed:', e); }
      }
      invoices.splice(idx, 1);
      save();
    }
  };

  return {
    invoices, activePatientId,
    filterDateStart, filterDateEnd, dateRangeMonths,
    save, loadFromBackend, getPatientInvoices,
    addInvoice, updateInvoice, deleteInvoice, syncInvoiceToBackend
  };
});

<template>
  <div class="dashboard">
    <div class="content-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h2 style="margin:0;">🏥 影像报告管理</h2>
      </div>

      <!-- 患者 Tab -->
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:1.2rem; padding-bottom:12px; border-bottom:2px solid #eee;">
        <div v-for="p in patientsStore.patients" :key="'img-tab-' + p.id"
          @click="switchPatient(p.id)" :style="tabStyle(p.id)">
          {{ p.name }}
          <span v-if="imagingStore.getPatientReports(p.id).length > 0" style="font-size:11px; opacity:0.8; margin-left:3px;">
            ({{ imagingStore.getPatientReports(p.id).length }})
          </span>
        </div>
      </div>

      <!-- 当前患者 -->
      <div v-if="activePatientId">
        <!-- 患者信息栏 + 上传 -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:#e8f5e9; padding:12px 18px; border-radius:8px; margin-bottom:1rem; border-left:4px solid #2e7d32;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; border-radius:50%; overflow:hidden; background:#f5f5f5; border:2px solid #ddd; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <img v-if="activePatient?.avatar" :src="activePatient.avatar" style="width:100%;height:100%;object-fit:cover;">
              <AppIcon v-else name="avatar" :size="24" style="color:#ccc;" />
            </div>
            <div>
              <div style="font-weight:600; font-size:15px; color:#333;">{{ activePatient?.name }} 的影像报告</div>
              <div style="font-size:12px; color:#888; margin-top:2px;">
                {{ activePatient?.patientNo }} | {{ activePatient?.gender === 1 ? '男' : '女' }} | {{ activePatient?.phone }}
              </div>
            </div>
          </div>
          <el-button type="success" @click="triggerUpload">📤 上传报告</el-button>
        </div>

        <!-- 工具栏 -->
        <div v-if="imagingStore.getPatientReports(activePatientId).length > 0"
          style="background:white; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); padding:10px 14px; margin-bottom:1rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <div style="display:flex; gap:4px;">
              <button v-for="m in [3,6,12,0]" :key="m" @click="setDateRange(m)" :style="rangeBtn(m)">
                {{ m === 0 ? '全部' : `近${m === 12 ? '1年' : m + '个月'}` }}
              </button>
            </div>
            <span style="font-size:12px; color:#999;">共 {{ filteredReports.length }}/{{ imagingStore.getPatientReports(activePatientId).length }} 份</span>
          </div>
          <div style="display:flex; gap:6px;">
            <el-button size="small" type="primary" @click="downloadAll" :loading="downloadAllLoading">📥 全部下载</el-button>
            <el-button size="small" type="danger" @click="batchDelete">🗑️ 批量删除</el-button>
          </div>
        </div>

        <!-- 报告按钮列表 -->
        <div v-if="filteredReports.length > 0" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:1rem;">
          <div v-for="r in filteredReports" :key="'img-btn-' + r.id"
            @click="selectReport(r.id)"
            :style="reportBtnStyle(r.id)">
            <div style="font-weight:600; margin-bottom:2px;">{{ formatDate(r.date) }}</div>
            <div style="font-size:12px; opacity:0.85;">{{ r.title }}</div>
          </div>
        </div>

        <!-- 选中报告详情 -->
        <div v-if="selectedReport">
          <!-- 操作栏 -->
          <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">
            <el-button size="small" type="warning" @click="viewOcrText">📝 OCR原文</el-button>
            <el-button size="small" style="background:#6366f1; color:white; border:none;" @click="triggerAiAnalysis" :loading="aiLoading"><img src="/pic/AIGLM.png" style="height:14px; vertical-align:middle; margin-right:5px; filter:brightness(0) invert(1);" /> AI智能分析</el-button>
            <el-button size="small" type="warning" @click="renameReport">✏️ 修改名称</el-button>
            <el-button size="small" type="danger" @click="deleteReport">🗑️ 删除报告</el-button>
            <div style="margin-left:auto; display:flex; gap:12px; font-size:12px; color:#888; flex-wrap:wrap;">
              <span>📋 {{ selectedReport.title }}</span>
              <span>📅 {{ formatDate(selectedReport.date) }}</span>
              <span>📄 {{ selectedReport.fileName }}</span>
              <span v-if="selectedReport.ocrConfidence">🎯 {{ selectedReport.ocrConfidence }}%</span>
            </div>
          </div>

          <!-- 左右分栏：预览 + AI -->
          <div style="display:flex; gap:16px; min-height:500px;">
            <!-- 左：报告预览 -->
            <div style="flex:1; background:#f8f8f8; border:1px solid #e0e0e0; border-radius:8px; overflow:hidden; display:flex; flex-direction:column;">
              <div style="padding:8px 12px; background:#e8e8e8; font-size:13px; font-weight:600; color:#555; border-bottom:1px solid #ddd;">🔍 报告预览</div>
              <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:12px; overflow:auto;">
                <template v-if="selectedReport.fileUrl">
                  <img v-if="isImage(selectedReport)"
                    :src="selectedReport.fileUrl"
                    @click="openPreview"
                    style="max-width:100%; max-height:480px; object-fit:contain; cursor:pointer; border-radius:6px;" />
                  <iframe v-else-if="isPdf(selectedReport)"
                    :src="selectedReport.fileUrl"
                    style="width:100%; height:480px; border:none; border-radius:6px;" />
                </template>
                <div v-else style="text-align:center; color:#999;">
                  <div style="font-size:3rem; margin-bottom:12px;">📄</div>
                  <p>文件预览不可用</p>
                </div>
              </div>
            </div>

            <!-- 右：AI 分析 -->
            <div style="flex:1; background:#fafaff; border:1px solid #e0e0ff; border-radius:8px; overflow:hidden; display:flex; flex-direction:column;">
              <div style="padding:8px 12px; background:#e8e8ff; font-size:13px; font-weight:600; color:#555; border-bottom:1px solid #d0d0ff; display:flex; align-items:center; gap:6px;"><img src="/pic/AIGLM.png" style="height:16px; opacity:0.7;" /> AI智能分析</div>
              <div style="flex:1; padding:16px; overflow-y:auto;">
                <div v-if="aiLoading" style="display:flex; align-items:center; justify-content:center; height:100%;">
                  <div style="text-align:center;"><div style="font-size:2.5rem; margin-bottom:16px;">🔬</div><div style="font-size:15px; color:#555;">AI正在分析中...</div></div>
                </div>
                <div v-else-if="aiResult" style="white-space:pre-wrap; line-height:1.8; font-size:14px; color:#333; background:white; padding:16px; border-radius:8px; border:1px solid #e8e8ff;">{{ aiResult }}</div>
                <div v-else-if="aiError" style="display:flex; align-items:center; justify-content:center; height:100%;">
                  <div style="text-align:center; color:#ef4444;">
                    <div style="font-size:2rem; margin-bottom:12px;">⚠️</div>
                    <div>{{ aiError }}</div>
                    <el-button style="margin-top:12px;" size="small" @click="triggerAiAnalysis">🔄 重试</el-button>
                  </div>
                </div>
                <div v-else style="display:flex; align-items:center; justify-content:center; height:100%;">
                  <div style="text-align:center; color:#aaa;">
                    <div style="margin-bottom:14px;"><img src="/pic/AIGLM.png" style="height:36px; opacity:0.35;" /></div>
                    <div style="font-size:14px;">点击上方「AI智能分析」按钮</div>
                    <div style="font-size:12px; margin-top:4px;">基于OCR文本进行AI智能解读</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 未选中报告 -->
        <div v-else-if="filteredReports.length > 0" style="background:#f8f9fa; padding:2rem; border-radius:8px; text-align:center; color:#888;">
          <div style="font-size:2rem; margin-bottom:0.5rem;">👆</div>
          <p>请选择一份影像报告查看详情</p>
        </div>

        <!-- 无报告 -->
        <div v-else style="background:#f8f9fa; padding:3rem; border-radius:8px; text-align:center; color:#888;">
          <div style="font-size:3rem; margin-bottom:1rem;">🏥</div>
          <p style="font-size:1.1rem; margin-bottom:1rem;">该患者暂无影像报告</p>
          <el-button type="success" @click="triggerUpload">📤 上传第一份报告</el-button>
        </div>
      </div>

      <!-- 未选患者 -->
      <div v-else style="background:#f8f9fa; padding:3rem; border-radius:8px; text-align:center; color:#888;">
        <div style="font-size:3rem; margin-bottom:1rem;">👆</div>
        <p>请先选择一位患者</p>
      </div>
    </div>

    <!-- OCR原文弹窗 -->
    <el-dialog v-model="ocrDialogVisible" title="📝 OCR识别原文" width="700px">
      <pre style="white-space:pre-wrap; font-size:13px; color:#333; max-height:60vh; overflow-y:auto; background:#f8f9fa; padding:16px; border-radius:8px; line-height:1.6;">{{ ocrText }}</pre>
      <template #footer><el-button @click="ocrDialogVisible = false">关闭</el-button></template>
    </el-dialog>

    <!-- 图片全屏预览 -->
    <el-dialog v-model="previewVisible" title="📷 报告预览" width="90vw" style="max-width:1000px;">
      <div style="text-align:center;">
        <img :src="selectedReport?.fileUrl" style="max-width:100%; max-height:75vh; object-fit:contain; border-radius:8px;" />
      </div>
      <template #footer>
        <el-button @click="openInNewWindow">↗ 新窗口打开</el-button>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { usePatientsStore } from '@/stores/usePatients';
import JSZip from 'jszip';
import { useImagingStore } from '@/stores/useImaging';
import { apiRequest, uploadFileToCloud } from '@/api/index';
import { formatDate } from '@/utils/index';

const route = useRoute();
const patientsStore = usePatientsStore();
const imagingStore = useImagingStore();

const activePatientId = ref(null);

onMounted(() => {
  const pid = route.query.patientId;
  if (pid) {
    const id = Number(pid);
    if (patientsStore.patients.some(p => p.id === id)) {
      activePatientId.value = id;
    }
  }
});
const selectedReportId = ref(null);
const filterDateStart = ref('');
const filterDateEnd = ref('');
const dateRangeMonths = ref(0);
const aiLoading = ref(false);
const aiResult = ref('');
const aiError = ref('');
let aiLastRequestTime = 0;
const AI_COOLDOWN_MS = 5000;
const ocrDialogVisible = ref(false);
const ocrText = ref('');
const previewVisible = ref(false);

const activePatient = computed(() => patientsStore.getPatientById(activePatientId.value));
const filteredReports = computed(() => {
  let list = activePatientId.value ? imagingStore.getPatientReports(activePatientId.value) : [];
  if (filterDateStart.value) list = list.filter(r => r.date >= filterDateStart.value);
  if (filterDateEnd.value) list = list.filter(r => r.date <= filterDateEnd.value);
  return list;
});
const selectedReport = computed(() => selectedReportId.value ? imagingStore.getReportById(selectedReportId.value) : null);

const isImage = (r) => r.fileType?.startsWith('image/');
const isPdf = (r) => r.fileType === 'application/pdf' || r.fileName?.toLowerCase().endsWith('.pdf');

// 样式
const tabStyle = (id) => ({
  padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap',
  fontWeight: activePatientId.value === id ? '600' : '400',
  background: activePatientId.value === id ? '#2e7d32' : '#f5f5f5',
  color: activePatientId.value === id ? 'white' : '#555',
  border: activePatientId.value === id ? '1px solid #2e7d32' : '1px solid #ddd',
  transition: 'all 0.2s'
});
const rangeBtn = (m) => ({
  padding: '4px 8px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', border: '1px solid',
  borderColor: dateRangeMonths.value === m ? '#2e7d32' : '#ddd',
  background: dateRangeMonths.value === m ? '#e8f5e9' : '#f5f5f5',
  color: dateRangeMonths.value === m ? '#2e7d32' : '#666',
  fontWeight: dateRangeMonths.value === m ? '600' : '400'
});
const reportBtnStyle = (id) => ({
  padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
  minWidth: '120px', textAlign: 'center', transition: 'all 0.2s',
  background: selectedReportId.value === id ? '#1b5e20' : '#f5f5f5',
  color: selectedReportId.value === id ? 'white' : '#333',
  border: selectedReportId.value === id ? '2px solid #1b5e20' : '1px solid #ddd'
});

const switchPatient = (id) => { activePatientId.value = id; selectedReportId.value = null; aiResult.value = ''; aiError.value = ''; };
const selectReport = (id) => { selectedReportId.value = id; aiResult.value = ''; aiError.value = ''; aiLoading.value = false; };
const setDateRange = (m) => {
  dateRangeMonths.value = m;
  // 【修复】切换日期范围时清空选中报告
  selectedReportId.value = null;
  aiResult.value = '';
  aiError.value = '';
  if (m === 0) { filterDateStart.value = ''; filterDateEnd.value = ''; return; }
  const end = new Date(), start = new Date();
  start.setMonth(start.getMonth() - m);
  // 【修复】使用本地日期格式，避免 toISOString 的 UTC 转换问题
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  filterDateEnd.value = fmt(end);
  filterDateStart.value = fmt(start);
};

// 上传
const triggerUpload = () => {
  if (!activePatientId.value) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/bmp,application/pdf';
  input.multiple = true;
  input.onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (f.size > 10 * 1024 * 1024) { ElMessage.error(`${f.name} 超过10MB，已跳过`); return false; }
      return true;
    });
    if (validFiles.length === 0) return;
    let successCount = 0, lastId = null;
    const totalFiles = validFiles.length;
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      console.log(`\n=== 影像报告 [${i + 1}/${totalFiles}]: ${file.name} ===`);
      if (i > 0) await new Promise(r => setTimeout(r, 1000));
      try {
        ElMessage.info(`正在上传 ${file.name}...`);
        const fileUrl = await uploadFileToCloud(file, 'imaging-reports');
        const ocrResult = await performOCR(file);
        console.log(`影像报告OCR [${i + 1}/${totalFiles}]:`, ocrResult.text?.substring(0, 80));
        let reportDate = extractDateFromOcr(ocrResult.text || '') || extractDateFromFilename(file.name);
        if (!reportDate) {
          reportDate = prompt(`文件 "${file.name}" 未识别到日期，请手动输入（YYYY-MM-DD）：`, new Date().toISOString().split('T')[0]);
          if (!reportDate) {
            console.log(`用户跳过文件: ${file.name}`);
            continue;
          }
        }
        let title = extractTitleFromOcr(ocrResult.text || '') || prompt(`未能自动识别报告类型，请手动输入名称（如：CT检查、核磁检查、胃镜检查等）：`, '');
        if (!title?.trim()) {
          console.log(`用户跳过文件: ${file.name}`);
          continue;
        }
        const payload = {
          patientId: activePatientId.value,
          reportDate,
          title: title.trim(),
          fileUrl, fileName: file.name, fileType: file.type,
          ocrRawText: ocrResult.text, ocrConfidence: ocrResult.confidence
        };
        let backendId = null;
        try {
          const res = await apiRequest('/imaging-reports', { method: 'POST', body: JSON.stringify(payload) });
          if (res.code === 200 && res.data?.id) backendId = res.data.id;
        } catch (e) { console.warn('[Imaging] Sync to backend failed:', e); }
        const newReport = {
          id: backendId || (Date.now() + i), backendId,
          patientId: activePatientId.value,
          date: reportDate, title: title.trim(),
          fileUrl, fileName: file.name, fileType: file.type,
          ocrRawText: ocrResult.text, ocrConfidence: ocrResult.confidence,
          uploadTime: Date.now()
        };
        imagingStore.addReport(newReport);
        lastId = newReport.id;
        successCount++;
        console.log(`=== 影像报告处理完成: ${file.name} (${title}, ${reportDate}) ===\n`);
      } catch (err) {
        console.error(`影像报告上传失败: ${file.name}`, err);
        ElMessage.error(`"${file.name}" 上传失败: ${err.message}`);
      }
    }
    if (lastId) selectedReportId.value = lastId;
    if (successCount > 0) ElMessage.success(`成功上传 ${successCount}/${validFiles.length} 个影像报告`);
  };
  input.click();
};

const performOCR = async (file, maxRetries = 2) => {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('emr_token');
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      if (!response.ok) throw new Error(`OCR HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'OCR失败');
      return data.data;
    } catch (err) {
      if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue; }
      throw err;
    }
  }
};

const extractDateFromOcr = (text) => {
  if (!text) return null;
  const m = text.match(/(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` : null;
};
const extractDateFromFilename = (filename) => {
  const m = filename?.match(/(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};
const extractTitleFromOcr = (text) => {
  if (!text) return null;

  const has = (keyword) => text.includes(keyword);
  const hasCT  = /\bCT\b/i.test(text);
  const hasMR  = /\bMRI?\b/.test(text) || has('核磁') || has('磁共振');
  const hasPET = has('PET') || has('pet') || has('Pet') ;
  const hasContrast = has('造影');
  const hasEnhanceMR = has('增强') || has('造影');
  const hasUltrasound = has('彩超') || has('超声');

  // PET 系列（优先级最高）
  if (hasPET && hasCT)  return 'PET/CT检查';
  if (hasPET && hasMR)  return 'PET/MR检查';

  // 增强系列
  if (hasEnhanceMR && hasMR) return '增强核磁检查';
  if (hasContrast && hasCT)  return '增强CT检查';

  // 核磁系列
  if (hasMR) return '核磁检查';

  // CT
  if (hasCT) return 'CT检查';
  if (has('X光')) return 'X光检查';
  if (has('钼靶')) return '乳腺钼靶检查';

  // 超声系列
  if (has('甲状腺') && hasUltrasound) return '甲状腺超声';
  if (has('泌尿') && hasUltrasound)   return '泌尿系统超声';
  if (has('乳腺') && hasUltrasound)   return '乳腺超声';
  if (has('心脏') && hasUltrasound)   return '心脏超声';


  // 内镜
  if (has('肠镜')) return '肠镜检查';
  if (has('胃镜')) return '胃镜检查';

  // 心电
  if (has('动态') && has('心电')) return '动态心电图';
  if (has('心电'))                return '心电图';

  // 病理
  if (has('病理')) return '病理报告';

  return null;
};

// 操作
const viewOcrText = () => {
  if (!selectedReport.value?.ocrRawText) { ElMessage.error('该报告没有OCR原文数据'); return; }
  ocrText.value = selectedReport.value.ocrRawText;
  ocrDialogVisible.value = true;
};

const openPreview = () => { previewVisible.value = true; };

const openInNewWindow = () => {
  if (!selectedReport.value?.fileUrl) {
    ElMessage.warning('文件链接不存在');
    return;
  }
  if (typeof window !== 'undefined' && window.open) {
    window.open(selectedReport.value.fileUrl, '_blank');
  }
};

const renameReport = async () => {
  if (!selectedReport.value) return;
  try {
    const newTitle = await ElMessageBox.prompt('请输入新的报告名称', '修改名称', {
      confirmButtonText: '确定', cancelButtonText: '取消',
      inputValue: selectedReport.value.title,
      inputValidator: (v) => v?.trim() ? true : '名称不能为空'
    });
    imagingStore.updateReport({ ...selectedReport.value, title: newTitle.value.trim() });
    ElMessage.success('报告名称已修改');
  } catch (_) {}
};

const deleteReport = async () => {
  if (!selectedReport.value) return;
  try {
    await ElMessageBox.confirm(`确定删除影像报告 "${selectedReport.value.title}"？此操作不可恢复！`, '确认删除', { type: 'warning' });
    const bid = selectedReport.value.backendId || selectedReport.value.id;
    if (bid) {
      try { await apiRequest(`/imaging-reports/${bid}`, { method: 'DELETE' }); } catch (e) { console.warn('[Imaging] Delete from backend failed:', e); }
    }
    imagingStore.deleteReport(selectedReportId.value);
    selectedReportId.value = null;
    ElMessage.success('影像报告已删除');
  } catch (_) {}
};

const batchDelete = async () => {
  if (filteredReports.value.length === 0) { ElMessage.warning('当前范围内没有可删除的报告'); return; }
  try {
    await ElMessageBox.confirm(`⚠️ 确定删除 ${filteredReports.value.length} 份影像报告？`, '批量删除', { type: 'warning' });
    filteredReports.value.forEach(r => imagingStore.deleteReport(r.id));
    selectedReportId.value = null;
    ElMessage.success('批量删除完成');
  } catch (_) {}
};

const downloadAllLoading = ref(false);
const downloadAll = async () => {
  const list = filteredReports.value.filter(r => r.fileUrl);
  if (list.length === 0) { ElMessage.warning('当前范围内没有可下载的报告'); return; }

  downloadAllLoading.value = true;
  ElMessage.info(`正在生成ZIP，共 ${list.length} 份报告，请稍候...`);
  try {
    const zip = new JSZip();
    const patient = patientsStore.getPatientById(activePatientId.value);
    const sanitize = (name) => (name || '').replace(/[\\\/:*?"<>|]/g, '_');
    const folderName = sanitize(patient ? `${patient.name}影像报告` : '影像报告');
    const fileNameCounters = {};
    let successCount = 0;

    for (const r of list) {
      try {
        let fileData, isBase64 = false;
        const ext = r.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
        if (r.fileUrl.startsWith('data:')) {
          fileData = r.fileUrl.split(',')[1]; isBase64 = true;
        } else {
          const res = await fetch(r.fileUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          fileData = await res.arrayBuffer();
        }
        let fileName = sanitize(`${r.date}_${r.title || r.fileName || '报告'}.${ext}`);
        if (fileNameCounters[fileName]) {
          fileNameCounters[fileName]++;
          fileName = sanitize(`${r.date}_${r.title || '报告'}_${fileNameCounters[fileName]}.${ext}`);
        } else { fileNameCounters[fileName] = 1; }
        zip.file(`${folderName}/${fileName}`, fileData, { base64: isBase64 });
        successCount++;
      } catch (e) { console.error(`[Imaging] ZIP add failed [${r.id}]:`, e); }
    }

    if (successCount === 0) { ElMessage.warning('所有报告文件获取失败'); return; }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const today = new Date();
    const zipName = `${sanitize(patient?.name || '')}影像报告_${today.getFullYear()}${today.getMonth()+1}${today.getDate()}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = zipName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ElMessage.success(`导出成功: ${zipName}（${successCount}/${list.length} 份）`);
  } catch (e) {
    console.error('[Imaging] Export ZIP failed:', e);
    ElMessage.error('导出失败: ' + e.message);
  } finally {
    downloadAllLoading.value = false;
  }
};

// AI 分析
const triggerAiAnalysis = async () => {
  if (!selectedReport.value) return;
  const now = Date.now();
  if (now - aiLastRequestTime < AI_COOLDOWN_MS) { aiError.value = '请5秒后再试'; return; }
  aiLastRequestTime = now;
  aiLoading.value = true; aiResult.value = ''; aiError.value = '';
  try {
    const patient = patientsStore.getPatientById(selectedReport.value.patientId);
    const dataText = selectedReport.value.ocrRawText?.replace(/\n{3,}/g, '\n\n').trim() || '（无OCR文本）';
    const res = await apiRequest('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ type: 'imaging', data: dataText, title: selectedReport.value.title || '', patientName: patient?.name || '未知' })
    });
    if (res.code === 200 && res.data) { aiResult.value = res.data; }
    else throw new Error(res.message || 'AI分析失败');
  } catch (err) {
    aiError.value = '分析失败: ' + err.message;
  } finally {
    aiLoading.value = false;
  }
};
</script>

<style scoped>
/* ===== Step1: 患者Tab横向单行滚动（不换行） ===== */
@media (max-width: 768px) {
  div[style*="flex-wrap:wrap; gap:8px; margin-bottom:1.2rem"] {
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    scrollbar-width: none !important;
    padding-bottom: 8px !important;
    -webkit-overflow-scrolling: touch;
  }
  div[style*="flex-wrap:wrap; gap:8px; margin-bottom:1.2rem"]::-webkit-scrollbar { display: none; }
}

/* ===== Step2: 患者信息栏手机端上下两行 ===== */
@media (max-width: 640px) {
  div[style*="background:#e8f5e9"][style*="justify-content:space-between"] {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }
  div[style*="background:#e8f5e9"][style*="justify-content:space-between"] > .el-button {
    width: 100% !important;
  }
  /* 工具栏按钮区域换行 */
  div[style*="justify-content:space-between; flex-wrap:wrap"] {
    flex-direction: column !important;
    align-items: stretch !important;
  }
  div[style*="justify-content:space-between; flex-wrap:wrap"] > div:last-child {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
}

/* ===== Step4: 预览+AI分析区域垂直堆叠 + 高度自适应 ===== */
@media (max-width: 768px) {
  div[style*="display:flex; gap:16px; min-height:500px"] {
    flex-direction: column !important;
    min-height: auto !important;
  }
  div[style*="display:flex; gap:16px; min-height:500px"] > div {
    min-height: 40vh !important;
  }
}
@media (max-width: 576px) {
  div[style*="display:flex; gap:16px; min-height:500px"] > div {
    min-height: 35vh !important;
  }
}
</style>

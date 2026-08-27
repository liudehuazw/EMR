<template>
  <div class="dashboard">
    <div class="content-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h2 style="margin:0; display:flex; align-items:center; gap:8px;"><AppIcon name="lab" :size="22" style="color:#0074fc;" /> 检验报告管理</h2>
      </div>

      <PatientTabBar
        :patients="patientsStore.patients"
        :active-patient-id="activePatientId"
        :get-count="(id) => labStore.getPatientReports(id).length"
        module-key="lab"
        accent-color="#cc5c5c"
        @select="switchPatient"
      />

      <!-- 当前患者区域 -->
      <div v-if="activePatientId">
        <!-- 患者信息栏 + 上传 -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8f0f0; padding:12px 18px; border-radius:8px; margin-bottom:1rem; border-left:4px solid #cc5c5c;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; border-radius:50%; overflow:hidden; background:#f5f5f5; border:2px solid #ddd; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <img v-if="activePatient?.avatar" :src="activePatient.avatar" style="width:100%;height:100%;object-fit:cover;">
              <AppIcon v-else name="avatar" :size="24" style="color:#ccc;" />
            </div>
            <div>
              <div style="font-weight:600; font-size:15px; color:#333;">{{ activePatient?.name }} 的检验报告</div>
              <div style="font-size:12px; color:#888; margin-top:2px;">
                {{ activePatient?.patientNo }} | {{ activePatient?.gender === 1 ? '男' : '女' }} | {{ activePatient?.phone }}
              </div>
            </div>
          </div>
          <el-button type="danger" @click="triggerUpload">📤 上传报告</el-button>
        </div>

        <DateRangeToolbar
          :show-toolbar="labStore.getPatientReports(activePatientId).length > 0"
          :range-btn-style="rangeBtnStyle"
          accent-color="#cc5c5c"
          :filtered-count="filteredReports.length"
          :total-count="labStore.getPatientReports(activePatientId).length"
          @set-range="(m) => setDateRange(m, onDateRangeChange)"
        >
          <template #actions>
            <el-button size="small" type="primary" :loading="downloadAllLoading" @click="downloadAll">📥 全部下载</el-button>
            <el-button size="small" type="warning" @click="batchReparse">🔄 批量解析</el-button>
            <el-button size="small" type="danger" @click="batchDelete">🗑️ 批量删除</el-button>
          </template>
        </DateRangeToolbar>

        <LabReportList
          :reports="filteredReports"
          :selected-report-id="selectedReportId"
          @select="selectReport"
        />

        <!-- 选中报告详情 -->
        <div v-if="selectedReport">
          <!-- 操作按钮栏 -->
          <div class="action-bar">
            <el-button size="small" style="background:#6366f1; color:white; border:none;" @click="triggerAiAnalysis" :loading="aiLoading"><img src="/pic/DeepSeek.png" style="height:14px; vertical-align:middle; margin-right:5px; filter:brightness(0) invert(1);" /> AI智能分析</el-button>
            <el-button size="small" type="warning" @click="reparseReport">🔄 重新解析OCR</el-button>
            <el-button size="small" style="background:#64748b; color:white; border:none;" @click="viewOcrText">📝 查看OCR原文</el-button>
            <el-button size="small" style="background:#8b5cf6; color:white; border:none;" @click="viewOriginal">📄 查看原报告</el-button>
            <el-button size="small" type="success" @click="editName">✏️ 修改名称</el-button>
            <el-button size="small" type="danger" @click="deleteReport">🗑️ 删除报告</el-button>
            <div class="action-meta">
              <span>📋 {{ selectedReport.testName }}</span>
              <span>📅 {{ formatDate(selectedReport.date) }}</span>
              <span :style="typeTagStyle">{{ isBodyFluidReport(selectedReport) ? '💧 体液' : '🩸 血液' }}</span>
            </div>
          </div>

          <div class="lab-detail-split">
            <LabReportTable :table-data="selectedReport.tableData || []" @edit-row="editRow" />
            <AiAnalysisPanel
              :loading="aiLoading"
              :result="aiResult"
              :error="aiError"
              empty-hint="基于检验报告数据进行AI智能解读"
              @retry="triggerAiAnalysis"
            />
          </div>

          <LabTrendSection
            ref="trendSectionRef"
            :trend-item="trendItem"
            :trend-items="trendItems"
            @update:trend-item="trendItem = $event"
            @render="onTrendRender"
          />
        </div>

        <!-- 无报告提示 -->
        <div v-else-if="filteredReports.length === 0" style="background:#f8f9fa; padding:2.5rem; border-radius:8px; text-align:center; color:#999;">
          <div style="font-size:3rem; margin-bottom:0.8rem;">📋</div>
          <p style="font-size:14px; margin-bottom:0.5rem;">该患者暂无检验报告</p>
          <p style="font-size:12px; color:#bbb;">点击上方「📤 上传报告」添加检验报告</p>
        </div>
      </div>

      <!-- 未选患者 -->
      <div v-else style="background:#f8f9fa; padding:2.5rem; border-radius:8px; text-align:center; color:#999;">
        <div style="font-size:3rem; margin-bottom:0.8rem;">👆</div>
        <p>请在上方选择一位患者查看检验报告</p>
      </div>
    </div>

    <OcrTextDialog v-model:visible="ocrDialogVisible" :text="ocrText" />
    <OriginalFileDialog
      v-model:visible="originalDialogVisible"
      :url="originalUrl"
      :is-pdf="originalIsPdf"
      title="📄 原检验报告"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import PatientTabBar from '@/components/common/PatientTabBar.vue';
import DateRangeToolbar from '@/components/common/DateRangeToolbar.vue';
import AiAnalysisPanel from '@/components/common/AiAnalysisPanel.vue';
import OcrTextDialog from '@/components/common/OcrTextDialog.vue';
import OriginalFileDialog from '@/components/common/OriginalFileDialog.vue';
import LabReportTable from '@/components/lab/LabReportTable.vue';
import LabReportList from '@/components/lab/LabReportList.vue';
import LabTrendSection from '@/components/lab/LabTrendSection.vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { usePatientsStore } from '@/stores/usePatients';
import { useLabStore } from '@/stores/useLab';
import { usePatientScope } from '@/stores/usePatientScope';
import { uploadFileToCloud } from '@/api/files';
import { processOcrFile } from '@/api/ocr';
import { analyzeWithAi } from '@/api/ai';
import { deleteLabReport } from '@/api/lab-reports';
import { useDateRangeFilter } from '@/composables/useDateRangeFilter';
import { useRoutePatientId } from '@/composables/useRoutePatientId';
import { isBodyFluidReport } from '@/composables/lab/useLabClassification';
import { useLabTrendChart } from '@/composables/lab/useLabTrendChart';
import {
  selectLabReportDate,
  extractDateFromFilename,
  extractTestNameFromFilename
} from '@/utils/lab-report-utils';
import { formatDate } from '@/utils/index';
import { parseLabTableFromOcrText, detectLabTestName } from '@/utils/lab-parser';

const patientsStore = usePatientsStore();
const labStore = useLabStore();
const patientScope = usePatientScope();

const { activePatientId } = useRoutePatientId(() => patientsStore.patients);
const selectedReportId = ref(null);
const aiLoading = ref(false);
const aiResult = ref('');
const aiError = ref('');
let aiLastRequestTime = 0;
const AI_COOLDOWN_MS = 5000;
const trendSectionRef = ref(null);

const ocrDialogVisible = ref(false);
const ocrText = ref('');
const originalDialogVisible = ref(false);
const originalUrl = ref('');
const originalIsPdf = ref(false);

const activePatient = computed(() => patientsStore.getPatientById(activePatientId.value));

const {
  filteredList: filteredReports,
  setDateRange,
  rangeBtnStyle
} = useDateRangeFilter(() =>
  activePatientId.value ? labStore.getPatientReports(activePatientId.value) : []
);

const selectedReport = computed(() =>
  selectedReportId.value ? labStore.getReportById(selectedReportId.value) : null
);

const trendItems = computed(() => {
  if (!selectedReport.value?.tableData) return [];
  const items = new Set();
  selectedReport.value.tableData.forEach(row => {
    if (!row.itemName || row.isNumeric === false) return;
    if (!isNaN(parseFloat(row.result))) items.add(row.itemName);
  });
  return Array.from(items).sort();
});

const typeTagStyle = computed(() => isBodyFluidReport(selectedReport.value)
  ? { padding: '2px 8px', borderRadius: '12px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }
  : { padding: '2px 8px', borderRadius: '12px', background: '#fff5f5', color: '#cc5c5c', border: '1px solid #e8b4b4' }
);

const { trendItem, renderTrendChart, resetTrend } = useLabTrendChart({
  labStore,
  activePatientId,
  selectedReport,
  getCanvasEl: () => {
    const el = trendSectionRef.value?.canvasEl;
    return el?.value ?? el;
  }
});

const onDateRangeChange = () => {
  selectedReportId.value = null;
  resetTrend();
  aiResult.value = '';
  aiError.value = '';
};

const switchPatient = (id) => {
  activePatientId.value = id;
  patientScope.setCurrentPatient(id);
  selectedReportId.value = null;
  resetTrend();
  aiResult.value = '';
  aiError.value = '';
};

const selectReport = (id) => {
  selectedReportId.value = id;
  resetTrend();
  aiResult.value = '';
  aiError.value = '';
  aiLoading.value = false;
};

const onTrendRender = async () => {
  const result = await renderTrendChart();
  if (result?.empty) ElMessage.warning(`未找到"${trendItem.value}"的数值数据`);
};

// ===== 上传报告 =====
const triggerUpload = () => {
  if (!activePatientId.value) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/bmp,application/pdf';
  input.multiple = true;
  input.onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const validFiles = files.filter(f => {
      if (f.size > 10 * 1024 * 1024) { ElMessage.error(`${f.name} 超过10MB限制，已跳过`); return false; }
      return true;
    });
    if (validFiles.length === 0) return;
    let successCount = 0;
    let lastId = null;
    const totalFiles = validFiles.length;
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      console.log(`\n=== 检验报告 [${i + 1}/${totalFiles}]: ${file.name} ===`);
      if (i > 0) await new Promise(r => setTimeout(r, 1000));
      try {
        ElMessage.info(`正在上传 ${file.name}...`);
        const fileUrl = await uploadFileToCloud(file, 'lab-reports');
        const ocrResult = await processOcrFile(file, { maxRetries: 2 });
        console.log(`检验报告OCR [${i + 1}/${totalFiles}]:`, ocrResult.text?.substring(0, 80));
        let reportDate = selectLabReportDate(ocrResult.text || '', ocrResult.extractedDates || []);
        if (!reportDate) reportDate = extractDateFromFilename(file.name);
        if (!reportDate) {
          reportDate = prompt(`文件 "${file.name}" 未识别到日期，请手动输入（YYYY-MM-DD）：`, new Date().toISOString().split('T')[0]);
          if (!reportDate) {
            console.log(`用户跳过文件: ${file.name}`);
            continue;
          }
        }
        let testName = detectLabTestName(ocrResult.text);
        if (!testName) {
          const { matched, hint } = extractTestNameFromFilename(file.name);
          testName = matched || prompt(`请输入检验项目名称（如：血常规、肝功能等）：`, hint);
          if (!testName?.trim()) {
            console.log(`用户跳过文件: ${file.name}`);
            continue;
          }
        }
        const tableData = parseLabTableFromOcrText(ocrResult.text);
        console.log('Parsed table data:', tableData);
        const newReport = {
          id: Date.now() + i, patientId: activePatientId.value,
          date: reportDate, testName: testName.trim(),
          fileUrl, fileName: file.name, fileType: file.type,
          ocrRawText: ocrResult.text, ocrConfidence: ocrResult.confidence,
          tableData, aiAnalysis: null, uploadTime: Date.now(), _dirty: true
        };
        labStore.addReport(newReport);
        lastId = newReport.id;
        successCount++;
        console.log(`=== 检验报告处理完成: ${file.name} (${testName}, ${reportDate}) ===\n`);
      } catch (err) {
        console.error(`检验报告上传失败: ${file.name}`, err);
        ElMessage.error(`"${file.name}" 上传失败: ${err.message}`);
      }
    }
    if (lastId) selectedReportId.value = lastId;
    if (successCount > 0) ElMessage.success(`成功上传 ${successCount}/${validFiles.length} 个检验报告`);
  };
  input.click();
};

// ===== 报告操作 =====
const reparseReport = () => {
  if (!selectedReport.value?.ocrRawText) { ElMessage.warning('该报告没有OCR原文，无法重新解析'); return; }
  const newTableData = parseLabTableFromOcrText(selectedReport.value.ocrRawText);
  const newTestName = detectLabTestName(selectedReport.value.ocrRawText) || selectedReport.value.testName;
  labStore.updateReport({ ...selectedReport.value, tableData: newTableData, testName: newTestName, _dirty: true });
  const id = selectedReportId.value;
  selectedReportId.value = null;
  setTimeout(() => { selectedReportId.value = id; }, 50);
  ElMessage.success(`解析完成，识别到 ${newTableData?.length || 0} 个项目`);
};

const viewOcrText = () => {
  if (!selectedReport.value?.ocrRawText) { ElMessage.error('该报告没有OCR原文数据'); return; }
  ocrText.value = selectedReport.value.ocrRawText;
  ocrDialogVisible.value = true;
};

const viewOriginal = () => {
  if (!selectedReport.value?.fileUrl) { ElMessage.warning('该报告无原始文件链接'); return; }
  originalUrl.value = selectedReport.value.fileUrl;
  originalIsPdf.value = (selectedReport.value.fileType?.includes('pdf')) ||
    selectedReport.value.fileUrl?.toLowerCase().includes('.pdf');
  originalDialogVisible.value = true;
};

const editRow = async (idx) => {
  const report = selectedReport.value;
  if (!report?.tableData?.[idx]) return;
  const row = report.tableData[idx];
  try {
    const { value } = await ElMessageBox.prompt(
      `修改检验项目（格式：项目名|结果|参考范围）：`,
      '手动修改',
      {
        inputValue: `${row.itemName}|${row.result}|${row.refRange || ''}`,
        confirmButtonText: '确定', cancelButtonText: '取消',
        inputPlaceholder: '项目名|结果|参考范围'
      }
    );
    if (!value?.trim()) return;
    const parts = value.split('|');
    const newRow = { ...row };
    if (parts[0] !== undefined) newRow.itemName = parts[0].trim();
    if (parts[1] !== undefined) newRow.result = parts[1].trim();
    if (parts[2] !== undefined) newRow.refRange = parts[2].trim();
    const newTableData = [...report.tableData];
    newTableData[idx] = newRow;
    labStore.updateReport({ ...report, tableData: newTableData, _dirty: true });
    ElMessage.success('已修改');
  } catch (_) { /* cancel */ }
};

const editName = async () => {
  if (!selectedReport.value) return;
  try {
    const { value } = await ElMessageBox.prompt('修改报告名称：', '编辑', {
      inputValue: selectedReport.value.testName,
      confirmButtonText: '确定', cancelButtonText: '取消'
    });
    if (!value?.trim()) { ElMessage.error('名称不能为空'); return; }
    selectedReport.value.testName = value.trim();
    selectedReport.value._dirty = true;
    labStore.save();
    ElMessage.success('名称已修改');
  } catch (_) { /* cancel */ }
};

const deleteReport = async () => {
  if (!selectedReport.value) return;
  try {
    await ElMessageBox.confirm(
      `确定要删除检验报告？\n📅 ${formatDate(selectedReport.value.date)}\n📋 ${selectedReport.value.testName}\n\n⚠️ 此操作不可恢复！`,
      '确认删除', { type: 'warning' }
    );
    if (selectedReport.value.backendId) {
      try { await deleteLabReport(selectedReport.value.backendId); } catch (_) {}
    }
    labStore.deleteReport(selectedReportId.value);
    selectedReportId.value = null;
    ElMessage.success('检验报告已删除');
  } catch (_) { /* cancel */ }
};

const batchReparse = async () => {
  const reports = filteredReports.value.filter(r => r.ocrRawText);
  if (reports.length === 0) { ElMessage.warning('当前范围内没有可重新解析的报告'); return; }
  try {
    await ElMessageBox.confirm(`确定要重新解析 ${reports.length} 份报告？`, '批量解析', { type: 'warning' });
    let count = 0;
    for (const r of reports) {
      try {
        const newTableData = parseLabTableFromOcrText(r.ocrRawText);
        labStore.updateReport({ ...r, tableData: newTableData, _dirty: true });
        count++;
      } catch (_) {}
    }
    ElMessage.success(`成功解析 ${count}/${reports.length} 份报告`);
  } catch (_) {}
};

const batchDelete = async () => {
  if (filteredReports.value.length === 0) { ElMessage.warning('当前范围内没有可删除的报告'); return; }
  try {
    await ElMessageBox.confirm(`⚠️ 确定要删除 ${filteredReports.value.length} 份检验报告？此操作不可恢复！`, '批量删除', { type: 'warning' });
    const ids = new Set(filteredReports.value.map(r => r.id));
    ids.forEach(id => labStore.deleteReport(id));
    selectedReportId.value = null;
    ElMessage.success(`已删除 ${ids.size} 份报告`);
  } catch (_) {}
};

const downloadAllLoading = ref(false);
const downloadAll = async () => {
  const list = filteredReports.value.filter(r => r.fileUrl);
  if (list.length === 0) { ElMessage.warning('当前范围内没有可下载的报告'); return; }

  downloadAllLoading.value = true;
  ElMessage.info(`正在生成ZIP，共 ${list.length} 份报告，请稍候...`);
  try {
    if (typeof window.JSZip === 'undefined') {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
        s.onload = resolve; s.onerror = () => reject(new Error('JSZip加载失败'));
        document.head.appendChild(s);
      });
    }
    const zip = new window.JSZip();
    const patient = patientsStore.getPatientById(activePatientId.value);
    const sanitize = (name) => (name || '').replace(/[\\/:*?"<>|]/g, '_');
    const folderName = sanitize(patient ? `${patient.name}检验报告` : '检验报告');
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
        let fileName = sanitize(`${r.date}_${r.testName || r.fileName || '报告'}.${ext}`);
        if (fileNameCounters[fileName]) {
          fileNameCounters[fileName]++;
          fileName = sanitize(`${r.date}_${r.testName || '报告'}_${fileNameCounters[fileName]}.${ext}`);
        } else { fileNameCounters[fileName] = 1; }
        zip.file(`${folderName}/${fileName}`, fileData, { base64: isBase64 });
        successCount++;
      } catch (e) { console.error(`[Lab] ZIP add failed [${r.id}]:`, e); }
    }

    if (successCount === 0) { ElMessage.warning('所有报告文件获取失败'); return; }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const today = new Date();
    const zipName = `${sanitize(patient?.name || '')}检验报告_${today.getFullYear()}${today.getMonth()+1}${today.getDate()}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = zipName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ElMessage.success(`导出成功: ${zipName}（${successCount}/${list.length} 份）`);
  } catch (e) {
    console.error('[Lab] Export ZIP failed:', e);
    ElMessage.error('导出失败: ' + e.message);
  } finally {
    downloadAllLoading.value = false;
  }
};

// ===== AI 分析 =====
const triggerAiAnalysis = async () => {
  if (!selectedReport.value) return;
  const now = Date.now();
  if (now - aiLastRequestTime < AI_COOLDOWN_MS) { aiError.value = '请5秒后再试'; return; }
  aiLastRequestTime = now;
  aiLoading.value = true; aiResult.value = ''; aiError.value = '';
  try {
    const patient = patientsStore.getPatientById(selectedReport.value.patientId);
    let dataText = `患者: ${patient?.name || '未知'}\n检验项目: ${selectedReport.value.testName || ''}\n报告日期: ${selectedReport.value.date || ''}\n\n检验结果:\n`;
    (selectedReport.value.tableData || []).forEach(item => {
      let line = `- ${item.itemName}: ${item.result}`;
      if (item.unit) line += ` ${item.unit}`;
      if (item.refRange) line += ` (参考范围: ${item.refRange})`;
      dataText += line + '\n';
    });
    const res = await analyzeWithAi({
      type: 'lab',
      data: dataText,
      title: selectedReport.value.testName || '',
      patientName: patient?.name || '未知'
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
.lab-detail-split {
  display: flex;
  gap: 16px;
  margin-bottom: 1.5rem;
  min-height: 450px;
}

/* ===== 报告操作按钮栏 ===== */
.action-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.action-meta {
  margin-left: auto;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #888;
  flex-wrap: wrap;
  align-items: center;
}

/* ===== 移动端：按钮纵向堆叠、等宽对齐 ===== */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .action-bar .el-button {
    width: 100%;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
  .action-meta {
    margin-left: 0;
    justify-content: flex-start;
    padding-top: 4px;
  }
}

/* ===== Step2: 患者信息栏手机端上下两行 ===== */
@media (max-width: 640px) {
  div[style*="background:#f8f0f0"][style*="justify-content:space-between"] {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }
  div[style*="background:#f8f0f0"][style*="justify-content:space-between"] > .el-button {
    width: 100% !important;
  }
  /* 工具栏整体换行 */
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

@media (max-width: 768px) {
  .lab-detail-split {
    flex-direction: column;
    min-height: auto;
  }
  .lab-detail-split > * { min-height: 40vh; }
}
</style>

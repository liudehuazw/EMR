<template>
  <div class="dashboard">
    <div class="content-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h2 style="margin:0;">📋 病历统计管理</h2>
        <el-button type="warning" @click="exportAllRecordsZip" :loading="exporting">📦 导出全部病历</el-button>
      </div>

      <!-- 患者 Tab -->
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:1.2rem; padding-bottom:12px; border-bottom:2px solid #eee;">
        <div v-for="p in patientsStore.patients" :key="'rec-tab-' + p.id"
          @click="switchPatient(p.id)" :style="tabStyle(p.id)">
          {{ p.name }}
          <span v-if="recordsStore.getPatientRecords(p.id).length > 0" style="font-size:11px; opacity:0.8; margin-left:3px;">
            ({{ recordsStore.getPatientRecords(p.id).length }})
          </span>
        </div>
      </div>

      <!-- 当前患者内容 -->
      <div v-if="activePatientId">
        <!-- 患者信息栏 + 上传 -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:#e8f0fe; padding:12px 18px; border-radius:8px; margin-bottom:1rem; border-left:4px solid #1a73e8;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; border-radius:50%; overflow:hidden; background:#f5f5f5; border:2px solid #ddd; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <img v-if="activePatient?.avatar" :src="activePatient.avatar" style="width:100%;height:100%;object-fit:cover;">
              <AppIcon v-else name="avatar" :size="24" style="color:#ccc;" />
            </div>
            <div>
              <div style="font-weight:600; font-size:15px; color:#333;">{{ activePatient?.name }} 的病历记录</div>
              <div style="font-size:12px; color:#888; margin-top:2px;">
                {{ activePatient?.patientNo }} | {{ activePatient?.gender === 1 ? '男' : '女' }} | {{ activePatient?.phone }}
              </div>
            </div>
          </div>
          <el-button type="primary" :loading="uploadingPatientId === activePatientId" @click="triggerUpload(activePatientId)">📤 上传病历</el-button>
        </div>

        <!-- 区域1：横排日期按钮 -->
        <div v-if="activeRecords.length > 0" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:1rem;">
          <div v-for="r in activeRecords" :key="'rec-btn-' + r.id"
            @click="selectRecord(r.id)"
            :style="recordBtnStyle(r.id)">
            <div style="font-weight:600;">{{ formatDate(r.date) }}</div>
            <div style="font-size:11px; opacity:0.8; margin-top:2px;">{{ (r.files || []).length }} 个文件</div>
          </div>
        </div>
        <div v-else style="color:#bbb; font-size:14px; padding:12px 0; text-align:center;">暂无病历，点击「上传病历」添加</div>

        <!-- 区域2+3：预览 + 备忘录 -->
        <div v-if="selectedRecord" style="display:flex; gap:16px; min-height:520px;">
          <!-- 区域2：病历文件预览 -->
          <div style="flex:1; background:#f8f8f8; border:1px solid #e0e0e0; border-radius:8px; overflow:hidden; display:flex; flex-direction:column;">
            <div style="padding:8px 12px; background:#e8e8e8; font-size:13px; font-weight:600; color:#555; border-bottom:1px solid #ddd; display:flex; align-items:center; justify-content:space-between;">
              <span>🔍 病历预览</span>
              <div style="display:flex; gap:6px;">
                <el-button v-if="currentFile" size="small" type="success" @click="downloadCurrent">💾 下载</el-button>
                <el-button size="small" type="danger" @click="confirmDeleteRecord">🗑 删除病历</el-button>
              </div>
            </div>
            <!-- 多文件切换 -->
            <div v-if="selectedRecord.files?.length > 1" style="display:flex; gap:6px; padding:8px 12px; background:#f0f0f0; border-bottom:1px solid #ddd; flex-wrap:wrap;">
              <span v-for="(f, idx) in selectedRecord.files" :key="idx"
                @click="currentFileIdx = idx"
                :style="{ padding:'3px 10px', borderRadius:'4px', fontSize:'12px', cursor:'pointer', background: currentFileIdx===idx ? '#1a73e8' : '#fff', color: currentFileIdx===idx ? '#fff' : '#555', border:'1px solid ' + (currentFileIdx===idx ? '#1a73e8' : '#ddd') }">
                {{ f.name || `文件${idx+1}` }}
              </span>
            </div>
            <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:12px; overflow:auto;">
              <template v-if="currentFile?.url && currentFile.url !== '#'">
                <img v-if="isImage(currentFile)" :src="currentFile.url"
                  style="max-width:100%; max-height:460px; object-fit:contain; border-radius:6px;" />
                <iframe v-else-if="isPdf(currentFile)" :src="currentFile.url"
                  style="width:100%; height:460px; border:none; border-radius:6px;" />
                <div v-else style="text-align:center; color:#999;">
                  <div style="font-size:3rem; margin-bottom:12px;">📄</div>
                  <p>{{ currentFile.name }}</p>
                  <el-button size="small" @click="downloadCurrent">下载查看</el-button>
                </div>
              </template>
              <div v-else style="text-align:center; color:#999;">
                <div style="font-size:3rem; margin-bottom:12px;">📭</div>
                <p>暂无可预览文件</p>
              </div>
            </div>
          </div>

          <!-- 区域3：就诊备忘录 -->
          <div style="flex:1; background:#fffdf0; border:1px solid #f0e0a0; border-radius:8px; overflow:hidden; display:flex; flex-direction:column;">
            <div style="padding:8px 12px; background:#fef3c7; font-size:13px; font-weight:600; color:#555; border-bottom:1px solid #f0e0a0; display:flex; align-items:center; justify-content:space-between;">
              <span>📝 就诊备忘录</span>
              <el-button size="small" type="warning" @click="saveMemo" :loading="memoSaving">保存</el-button>
            </div>
            <div style="flex:1; padding:16px; display:flex; flex-direction:column; gap:12px; overflow-y:auto;">
              <div>
                <div style="font-size:12px; color:#888; margin-bottom:4px;">就诊日期</div>
                <el-date-picker v-model="memoDate" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                  placeholder="选择就诊日期" style="width:100%;" size="small" />
              </div>
              <div>
                <div style="font-size:12px; color:#888; margin-bottom:4px;">就诊医院</div>
                <el-input v-model="memoHospital" placeholder="如：江苏省肿瘤医院" size="small" />
              </div>
              <div>
                <div style="font-size:12px; color:#888; margin-bottom:4px;">科室 / 主治医生</div>
                <el-input v-model="memoDepartment" placeholder="如：肿瘤内科 / 李医生" size="small" />
              </div>
              <div>
                <div style="font-size:12px; color:#888; margin-bottom:4px;">诊断结论</div>
                <el-input v-model="memoDiagnosis" placeholder="医生诊断结论" size="small" />
              </div>
              <div style="flex:1; display:flex; flex-direction:column;">
                <div style="font-size:12px; color:#888; margin-bottom:4px;">备注 / 个人记录</div>
                <el-input v-model="memoNotes" type="textarea" :rows="6" placeholder="记录用药情况、注意事项、下次复诊安排等..." style="flex:1;" />
              </div>
            </div>
          </div>
        </div>

        <el-empty v-else-if="activeRecords.length > 0" description="点击上方日期按钮查看病历" />
      </div>

      <el-empty v-if="!activePatientId && patientsStore.patients.length === 0" description="暂无患者数据" />
    </div>

    <!-- 隐藏的文件选择器 -->
    <input ref="fileInputRef" type="file" multiple accept="image/*,application/pdf"
      style="display:none" @change="handleFileChange" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { usePatientsStore } from '@/stores/usePatients';
import { useRecordsStore } from '@/stores/useRecords';
import { formatDate } from '@/utils/index';
import { uploadFileToCloud, apiRequest } from '@/api/index';

const route = useRoute();
const router = useRouter();
const patientsStore = usePatientsStore();
const recordsStore = useRecordsStore();

// ===== 患者切换 =====
const activePatientId = ref(null);
const activePatient = computed(() => patientsStore.patients.find(p => p.id === activePatientId.value) || null);
const activeRecords = computed(() => recordsStore.getPatientRecords(activePatientId.value));

const switchPatient = (patientId) => {
  activePatientId.value = patientId;
  selectedRecordId.value = null;
  currentFileIdx.value = 0;
};

const tabStyle = (patientId) => ({
  padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '14px',
  fontWeight: activePatientId.value === patientId ? '600' : '400',
  background: activePatientId.value === patientId ? '#1a73e8' : '#f5f5f5',
  color: activePatientId.value === patientId ? 'white' : '#555',
  border: `1px solid ${activePatientId.value === patientId ? '#1a73e8' : '#ddd'}`,
  transition: 'all 0.2s', userSelect: 'none'
});

const recordBtnStyle = (recordId) => ({
  padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
  background: selectedRecordId.value === recordId ? '#1a73e8' : '#f0f6ff',
  color: selectedRecordId.value === recordId ? 'white' : '#1a73e8',
  border: `1px solid ${selectedRecordId.value === recordId ? '#1a73e8' : '#b3d0ff'}`,
  transition: 'all 0.2s', userSelect: 'none', textAlign: 'center'
});

// ===== 病历选择 =====
const selectedRecordId = ref(null);
const selectedRecord = computed(() => activeRecords.value.find(r => r.id === selectedRecordId.value) || null);

const selectRecord = (recordId) => {
  selectedRecordId.value = recordId;
  currentFileIdx.value = 0;
  loadMemo();
};

// ===== 文件预览 =====
const currentFileIdx = ref(0);
const currentFile = computed(() => selectedRecord.value?.files?.[currentFileIdx.value] || null);

const isImage = (file) => file?.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file?.name || '');
const isPdf = (file) => file?.type?.includes('pdf') || /\.pdf$/i.test(file?.name || '');

const downloadCurrent = () => {
  const file = currentFile.value;
  if (!file?.url || file.url === '#') { ElMessage.warning('此文件无下载数据'); return; }
  const ext = file.name?.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : '.bin';
  const safeName = `${activePatient.value?.name || '患者'}_${selectedRecord.value?.date || ''}${ext}`.replace(/[\\/:*?"<>|]/g, '_');
  const a = document.createElement('a');
  a.href = file.url; a.download = safeName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  ElMessage.success(`正在下载: ${safeName}`);
};

// ===== 就诊备忘录 =====
const memoDate = ref('');
const memoHospital = ref('');
const memoDepartment = ref('');
const memoDiagnosis = ref('');
const memoNotes = ref('');
const memoSaving = ref(false);

const loadMemo = () => {
  const r = selectedRecord.value;
  if (!r) return;
  memoDate.value = r.date || '';
  memoHospital.value = r.hospital || '';
  memoDepartment.value = r.department || '';
  memoDiagnosis.value = r.diagnosis || '';
  memoNotes.value = r.notes || '';
};

const saveMemo = async () => {
  if (!selectedRecord.value) return;
  memoSaving.value = true;
  try {
    const updated = {
      ...selectedRecord.value,
      date: memoDate.value,
      hospital: memoHospital.value,
      department: memoDepartment.value,
      diagnosis: memoDiagnosis.value,
      notes: memoNotes.value
    };
    await recordsStore.updateRecord(updated);
    ElMessage.success('备忘录已保存');
  } catch (e) {
    ElMessage.error('保存失败: ' + e.message);
  } finally {
    memoSaving.value = false;
  }
};

// ===== 删除病历 =====
const confirmDeleteRecord = async () => {
  if (!selectedRecord.value) return;
  try {
    await ElMessageBox.confirm('确认删除该病历记录？此操作不可恢复。', '删除确认', { type: 'warning' });
    const record = selectedRecord.value;
    if (record.backendId) {
      try { await apiRequest(`/medical-records/${record.backendId}`, { method: 'DELETE' }); } catch (_) {}
    }
    const idx = recordsStore.medicalRecords.findIndex(r => r.id === record.id);
    if (idx !== -1) { recordsStore.medicalRecords.splice(idx, 1); recordsStore.save(); }
    selectedRecordId.value = null;
    ElMessage.success('病历已删除');
  } catch (_) {}
};

// ===== 上传病历 =====
const exporting = ref(false);
const uploadingPatientId = ref(null);
const fileInputRef = ref(null);
const uploadTargetPatientId = ref(null);

const triggerUpload = (patientId) => {
  uploadTargetPatientId.value = patientId;
  fileInputRef.value?.click();
};

const extractVisitDateFromOcr = (ocrText) => {
  if (!ocrText) return null;
  const keywords = ['就诊日期', '就诊时间', '就医时间', '就医日期', '门诊日期', '诊疗日期', '诊疗时间', '接诊时间', '挂号时间', '开单时间', '检查日期', '检查时间'];
  const lines = ocrText.split('\n');
  for (const kw of keywords) {
    for (const line of lines) {
      if (!line.includes(kw)) continue;
      const m = line.match(/(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})/);
      if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    }
  }
  const allDates = [...ocrText.matchAll(/(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})/g)];
  for (const m of allDates) {
    const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3]);
    if (y >= 2000 && y <= 2099 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)
      return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  }
  return null;
};

const performOCR = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('emr_token');
  const response = await fetch('/api/ocr/process', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });
  if (!response.ok) throw new Error(`OCR HTTP ${response.status}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'OCR失败');
  return data.data;
};

const handleFileChange = async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const patientId = uploadTargetPatientId.value;
  if (!patientId) return;
  e.target.value = '';
  uploadingPatientId.value = patientId;
  ElMessage.info(`正在上传并识别 ${files.length} 个文件...`);
  try {
    const uploadedFiles = [];
    let detectedDate = null;
    for (const file of files) {
      try {
        const url = await uploadFileToCloud(file, 'medical-records');
        uploadedFiles.push({ name: file.name, type: file.type, url, size: file.size });
        if (!detectedDate) {
          try {
            const ocrResult = await performOCR(file);
            detectedDate = extractVisitDateFromOcr(ocrResult.text || '');
            if (detectedDate) console.log('[Records] OCR识别就诊日期:', detectedDate);
          } catch (ocrErr) { console.warn('[Records] OCR失败:', ocrErr); }
        }
      } catch (err) {
        console.warn('[Records] 文件上传失败:', file.name, err);
        ElMessage.warning(`文件 ${file.name} 上传失败，已跳过`);
      }
    }
    if (uploadedFiles.length === 0) { ElMessage.error('所有文件上传失败'); return; }
    let visitDate = detectedDate;
    if (!visitDate) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const result = await ElMessageBox.prompt('未能自动识别就诊日期，请手动输入（格式：YYYY-MM-DD）', '请输入就诊日期',
          { confirmButtonText: '确认', cancelButtonText: '取消', inputValue: today, inputPattern: /^\d{4}-\d{2}-\d{2}$/, inputErrorMessage: '格式错误，请输入 YYYY-MM-DD' });
        visitDate = result.value;
      } catch (_) { visitDate = new Date().toISOString().slice(0, 10); }
    }
    const newRecord = { id: `rec_${Date.now()}`, patientId, date: visitDate, hospital: '', department: '', doctor: '', diagnosis: '', symptoms: '', treatment: '', notes: '', files: uploadedFiles };
    await recordsStore.addRecord(newRecord);
    ElMessage.success(`成功上传 ${uploadedFiles.length} 个文件（就诊日期：${visitDate}）`);
  } catch (err) {
    console.error('[Records] 上传异常:', err);
    ElMessage.error('上传失败: ' + err.message);
  } finally {
    uploadingPatientId.value = null;
  }
};

// ===== 导出ZIP =====
const exportAllRecordsZip = async () => {
  const allRecords = recordsStore.medicalRecords;
  if (allRecords.length === 0) { ElMessage.warning('暂无病历数据可导出'); return; }
  let totalFiles = 0;
  allRecords.forEach(r => r.files?.forEach(f => { if (f.url && f.url !== '#') totalFiles++; }));
  if (totalFiles === 0) { ElMessage.warning('所有病历均无实际文件可导出'); return; }
  exporting.value = true;
  ElMessage.info(`正在生成ZIP文件，共 ${totalFiles} 个文件...`);
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
    const patientMap = Object.fromEntries(patientsStore.patients.map(p => [p.id, p]));
    const sanitize = (name) => name.replace(/[\\/:*?"<>|]/g, '_');
    const getExt = (file) => { if (file.name?.includes('.')) return '.' + file.name.split('.').pop().toLowerCase(); return { 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf' }[file.type] || '.bin'; };
    const fileNameCounters = {};
    allRecords.forEach(record => {
      const patient = patientMap[record.patientId];
      if (!patient) return;
      const folder = sanitize(`${patient.name}(${patient.patientNo})`);
      (record.files || []).filter(f => f.url && f.url !== '#').forEach((file, fileIdx, arr) => {
        const ext = getExt(file);
        let base = sanitize(`${patient.name} ${formatDate(record.date)}`);
        if (arr.length > 1) base += `_${fileIdx + 1}`;
        let path = `${folder}/${base}${ext}`;
        if (fileNameCounters[path]) { fileNameCounters[path]++; path = `${folder}/${base}_${fileNameCounters[path]}${ext}`; } else { fileNameCounters[path] = 1; }
        try { if (file.url.startsWith('data:')) zip.file(path, file.url.split(',')[1], { base64: true }); } catch (e) { console.error('ZIP add failed:', path, e); }
      });
    });
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const today = new Date();
    const zipName = `病历导出_${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = zipName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ElMessage.success(`导出成功: ${zipName} (${totalFiles}个文件)`);
  } catch (e) {
    console.error('Export ZIP failed:', e);
    ElMessage.error('导出失败: ' + e.message);
  } finally {
    exporting.value = false;
  }
};

// ===== 初始化：自动选中第一个患者 =====
onMounted(() => {
  if (patientsStore.patients.length > 0) activePatientId.value = patientsStore.patients[0].id;
  // 支持从其他页面跳转传入 patientId
  const { patientId } = route.query;
  if (patientId) { activePatientId.value = Number(patientId) || patientId; router.replace({ path: '/records', query: {} }); }
});
watch(() => patientsStore.patients, (list) => { if (list.length > 0 && !activePatientId.value) activePatientId.value = list[0].id; }, { immediate: true });
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
  div[style*="background:#e8f0fe"][style*="justify-content:space-between"] {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }
  div[style*="background:#e8f0fe"][style*="justify-content:space-between"] > .el-button {
    width: 100% !important;
  }
}

/* ===== Step4: 预览+备忘录区域垂直堆叠 + 高度自适应 ===== */
@media (max-width: 768px) {
  div[style*="display:flex; gap:16px; min-height:520px"] {
    flex-direction: column !important;
    min-height: auto !important;
  }
  div[style*="display:flex; gap:16px; min-height:520px"] > div {
    min-height: 40vh !important;
  }
}
@media (max-width: 576px) {
  div[style*="display:flex; gap:16px; min-height:520px"] > div {
    min-height: 35vh !important;
  }
}
</style>

<template>
  <div class="dashboard">
    <div class="content-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h2 style="margin:0; display:flex; align-items:center; gap:8px;"><AppIcon name="lab" :size="22" style="color:#0074fc;" /> 检验报告管理</h2>
      </div>

      <!-- 患者 Tab 切换 -->
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:1.2rem; padding-bottom:12px; border-bottom:2px solid #eee;">
        <div
          v-for="p in patientsStore.patients" :key="'lab-tab-' + p.id"
          @click="switchPatient(p.id)"
          :style="tabStyle(p.id)"
        >
          {{ p.name }}
          <span v-if="labStore.getPatientReports(p.id).length > 0" style="font-size:11px; opacity:0.8; margin-left:3px;">
            ({{ labStore.getPatientReports(p.id).length }})
          </span>
        </div>
      </div>

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

        <!-- 工具栏：时间筛选 + 批量操作 -->
        <div v-if="labStore.getPatientReports(activePatientId).length > 0"
          style="background:white; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); padding:10px 14px; margin-bottom:1rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <div style="display:flex; gap:4px;">
              <button v-for="m in [3,6,12,0]" :key="m" @click="setDateRange(m)" :style="rangeBtn(m)">
                {{ m === 0 ? '全部' : `近${m === 12 ? '1年' : m + '个月'}` }}
              </button>
            </div>
            <span style="font-size:12px; color:#999;">
              共 {{ filteredReports.length }}/{{ labStore.getPatientReports(activePatientId).length }} 份
            </span>
          </div>
          <div style="display:flex; gap:6px;">
            <el-button size="small" type="primary" @click="downloadAll" :loading="downloadAllLoading">📥 全部下载</el-button>
            <el-button size="small" type="warning" @click="batchReparse">🔄 批量解析</el-button>
            <el-button size="small" type="danger" @click="batchDelete">🗑️ 批量删除</el-button>
          </div>
        </div>

        <!-- 报告按钮列表（体液 / 血液 分类） -->
        <div v-if="filteredReports.length > 0">
          <!-- 体液 -->
          <div v-if="filteredBodyFluid.length > 0" style="margin-bottom:1rem;">
            <div style="font-size:12px; color:#666; margin-bottom:6px; font-weight:600;">💧 体液检验报告 ({{ filteredBodyFluid.length }})</div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              <div v-for="r in filteredBodyFluid" :key="'bf-' + r.id"
                @click="selectReport(r.id)"
                :style="reportBtnStyle(r.id, 'bodyFluid')">
                {{ formatDate(r.date) }} {{ r.testName }}
              </div>
            </div>
          </div>
          <!-- 血液 -->
          <div v-if="filteredBlood.length > 0" style="margin-bottom:1rem;">
            <div style="font-size:12px; color:#666; margin-bottom:6px; font-weight:600;">🩸 血液检验报告 ({{ filteredBlood.length }})</div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              <div v-for="r in filteredBlood" :key="'bl-' + r.id"
                @click="selectReport(r.id)"
                :style="reportBtnStyle(r.id, 'blood')">
                {{ formatDate(r.date) }} {{ r.testName }}
              </div>
            </div>
          </div>
        </div>

        <!-- 选中报告详情 -->
        <div v-if="selectedReport">
          <!-- 操作按钮栏 -->
          <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">
            <el-button size="small" style="background:#6366f1; color:white; border:none;" @click="triggerAiAnalysis" :loading="aiLoading"><img src="/pic/AIGLM.png" style="height:14px; vertical-align:middle; margin-right:5px; filter:brightness(0) invert(1);" /> AI智能分析</el-button>
            <el-button size="small" type="warning" @click="reparseReport">🔄 重新解析OCR</el-button>
            <el-button size="small" style="background:#64748b; color:white; border:none;" @click="viewOcrText">📝 查看OCR原文</el-button>
            <el-button size="small" style="background:#8b5cf6; color:white; border:none;" @click="viewOriginal">📄 查看原报告</el-button>
            <el-button size="small" type="success" @click="editName">✏️ 修改名称</el-button>
            <el-button size="small" type="danger" @click="deleteReport">🗑️ 删除报告</el-button>
            <div style="margin-left:auto; display:flex; gap:12px; font-size:12px; color:#888; flex-wrap:wrap; align-items:center;">
              <span>📋 {{ selectedReport.testName }}</span>
              <span>📅 {{ formatDate(selectedReport.date) }}</span>
              <span :style="typeTagStyle">{{ isBodyFluid(selectedReport) ? '💧 体液' : '🩸 血液' }}</span>
            </div>
          </div>

          <!-- 左右分栏：表格 + AI -->
          <div style="display:flex; gap:16px; margin-bottom:1.5rem; min-height:450px;">
            <!-- 检验数据表格 -->
            <div style="flex:1; background:white; border:1px solid #d0d0d0; border-radius:8px; overflow:hidden; display:flex; flex-direction:column;">
              <div style="padding:10px 14px; background:#f5f5f5; font-size:13px; font-weight:600; color:#444; border-bottom:1px solid #ddd;">📋 检验数据</div>
              <div style="flex:1; overflow:auto; padding:8px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                  <thead>
                    <tr style="background:#f0f0f0;">
                      <th class="th-cell">项目代码</th>
                      <th class="th-cell">检验项目</th>
                      <th class="th-cell" style="text-align:center;">结果</th>
                      <th class="th-cell" style="text-align:center;">标志</th>
                      <th class="th-cell" style="text-align:center;">参考范围</th>
                      <th class="th-cell" style="text-align:center; width:50px;">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!selectedReport.tableData || selectedReport.tableData.length === 0">
                      <td colspan="6" style="padding:20px; text-align:center; color:#bbb;">暂无结构化数据（OCR未能解析表格）</td>
                    </tr>
                    <tr v-for="(row, idx) in (selectedReport.tableData || [])" :key="idx"
                      :class="rowHighlightClass(row)"
                      :style="rowHighlightStyle(row)">
                      <td class="td-cell" style="color:#888;">{{ row.code || '' }}</td>
                      <td class="td-cell" style="font-weight:500;">{{ row.itemName }}</td>
                      <td class="td-cell result-cell" style="text-align:center;">
                        <span class="result-value" :class="resultValueClass(row)">
                          {{ (row.resultPrefix || '') + row.result }}
                        </span>
                        <!-- 进度条：只对纯数值结果显示 -->
                        <div v-if="calcBarWidth(row) !== null" class="result-bar-wrap">
                          <div class="result-bar-track">
                            <div class="result-bar-fill" :class="barFillClass(row)" :style="{ width: calcBarWidth(row) + '%' }"></div>
                            <div class="result-bar-normal"></div>
                          </div>
                        </div>
                      </td>
                      <td class="td-cell flag-cell" style="text-align:center;">
                        <span v-if="row.flag" class="flag-badge" :class="row.flag === '↑' ? 'flag-high' : 'flag-low'">{{ row.flag }}</span>
                      </td>
                      <td class="td-cell" style="text-align:center; color:#666; font-size:12px;">{{ row.refRange || '' }}</td>
                      <td class="td-cell" style="text-align:center;">
                        <span style="cursor:pointer; color:#6366f1; font-size:13px;" @click="editRow(idx)" title="修改此行">✏️</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- AI 分析面板 -->
            <div style="flex:1; background:#fafaff; border:1px solid #e0e0ff; border-radius:8px; overflow:hidden; display:flex; flex-direction:column;">
              <div style="padding:10px 14px; background:#e8e8ff; font-size:13px; font-weight:600; color:#555; border-bottom:1px solid #d0d0ff; display:flex; align-items:center; gap:6px;"><img src="/pic/AIGLM.png" style="height:16px; opacity:0.7;" /> AI智能分析</div>
              <div style="flex:1; padding:16px; overflow-y:auto;">
                <div v-if="aiLoading" style="display:flex; align-items:center; justify-content:center; height:100%;">
                  <div style="text-align:center;">
                    <div style="font-size:2.5rem; margin-bottom:16px;">🔬</div>
                    <div style="font-size:15px; color:#555;">AI正在分析中...</div>
                  </div>
                </div>
                <div v-else-if="aiResult" style="white-space:pre-wrap; line-height:1.8; font-size:14px; color:#333; background:white; padding:16px; border-radius:8px; border:1px solid #e8e8ff;">{{ aiResult }}</div>
                <div v-else-if="aiError" style="display:flex; align-items:center; justify-content:center; height:100%;">
                  <div style="text-align:center; color:#ef4444;">
                    <div style="font-size:2rem; margin-bottom:12px;">⚠️</div>
                    <div style="font-size:14px;">{{ aiError }}</div>
                    <el-button style="margin-top:12px;" size="small" @click="triggerAiAnalysis">🔄 重试</el-button>
                  </div>
                </div>
                <div v-else style="display:flex; align-items:center; justify-content:center; height:100%;">
                  <div style="text-align:center; color:#aaa;">
                    <div style="margin-bottom:14px;"><img src="/pic/AIGLM.png" style="height:36px; opacity:0.35;" /></div>
                    <div style="font-size:14px;">点击上方「AI智能分析」按钮</div>
                    <div style="font-size:12px; margin-top:4px;">基于检验报告数据进行AI智能解读</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 趋势分析 -->
          <div style="border:1px solid #e0e0e0; border-radius:8px; padding:16px; background:#fafafa;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; flex-wrap:wrap;">
              <span style="font-weight:600; font-size:14px; color:#444;">📈 趋势分析</span>
              <select v-model="trendItem" @change="renderTrendChart"
                style="padding:6px 12px; border:1px solid #ccc; border-radius:5px; font-size:13px; min-width:180px; cursor:pointer;">
                <option value="">-- 选择检验项目 --</option>
                <option v-for="item in trendItems" :key="item" :value="item">{{ item }}</option>
              </select>
            </div>
            <div v-if="trendItem" style="background:white; border-radius:6px; padding:16px; border:1px solid #eee; min-height:350px;">
              <canvas ref="trendCanvasRef" style="width:100%; height:400px;"></canvas>
            </div>
            <div v-else style="text-align:center; color:#bbb; padding:40px; font-size:13px;">
              选择一个检验项目查看数值变化趋势
            </div>
          </div>
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

    <!-- OCR原文弹窗 -->
    <el-dialog v-model="ocrDialogVisible" title="📝 OCR识别原文" width="700px">
      <pre style="white-space:pre-wrap; font-size:13px; color:#333; max-height:60vh; overflow-y:auto; background:#f8f9fa; padding:16px; border-radius:8px; line-height:1.6;">{{ ocrText }}</pre>
      <template #footer>
        <el-button @click="ocrDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 原报告预览弹窗 -->
    <el-dialog v-model="originalDialogVisible" title="📄 原检验报告" width="90vw" style="max-width:1000px;">
      <div style="background:#f5f5f5; display:flex; align-items:center; justify-content:center; min-height:70vh; border-radius:8px; overflow:hidden;">
        <iframe v-if="originalIsPdf" :src="originalUrl" style="width:100%; height:75vh; border:none;" />
        <img v-else :src="originalUrl" style="max-width:100%; max-height:70vh; object-fit:contain; border-radius:8px;" />
      </div>
      <template #footer>
        <el-button @click="window.open(originalUrl, '_blank')">↗ 新窗口打开</el-button>
        <el-button @click="originalDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { usePatientsStore } from '@/stores/usePatients';
import Chart from 'chart.js/auto';
import { useLabStore } from '@/stores/useLab';
import { apiRequest } from '@/api/index';
import { uploadFileToCloud } from '@/api/index';
import { formatDate } from '@/utils/index';
import { parseLabTableFromOcrText, detectLabTestName } from '@/utils/lab-parser';

const route = useRoute();
const patientsStore = usePatientsStore();
const labStore = useLabStore();

// ===== 状态 =====
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
const trendItem = ref('');
const trendCanvasRef = ref(null);
let trendChartInstance = null;

const ocrDialogVisible = ref(false);
const ocrText = ref('');
const originalDialogVisible = ref(false);
const originalUrl = ref('');
const originalIsPdf = ref(false);

// ===== Computed =====
const activePatient = computed(() => patientsStore.getPatientById(activePatientId.value));

const BODY_FLUID_KEYWORDS = ['尿常规', '尿液常规', '粪便常规', '大便常规', '粪常规', '尿', '粪', '便'];
const BLOOD_EXCLUSIONS = ['钠尿肽', '脑钠肽', 'NT-proBNP', 'BNP'];
const isBodyFluid = (report) => {
  if (!report?.testName) return false;
  const name = report.testName.toLowerCase();
  if (BLOOD_EXCLUSIONS.some(k => name.includes(k.toLowerCase()))) return false;
  return BODY_FLUID_KEYWORDS.some(k => name.includes(k.toLowerCase()));
};

const filteredReports = computed(() => {
  let list = activePatientId.value ? labStore.getPatientReports(activePatientId.value) : [];
  if (filterDateStart.value) list = list.filter(r => r.date >= filterDateStart.value);
  if (filterDateEnd.value) list = list.filter(r => r.date <= filterDateEnd.value);
  return list;
});
const filteredBodyFluid = computed(() => filteredReports.value.filter(r => isBodyFluid(r)));
const filteredBlood = computed(() => filteredReports.value.filter(r => !isBodyFluid(r)));
const selectedReport = computed(() => selectedReportId.value ? labStore.getReportById(selectedReportId.value) : null);

const trendItems = computed(() => {
  if (!selectedReport.value?.tableData) return [];
  const items = new Set();
  selectedReport.value.tableData.forEach(row => {
    if (!row.itemName || row.isNumeric === false) return;
    if (!isNaN(parseFloat(row.result))) items.add(row.itemName);
  });
  return Array.from(items).sort();
});

const typeTagStyle = computed(() => isBodyFluid(selectedReport.value)
  ? { padding: '2px 8px', borderRadius: '12px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }
  : { padding: '2px 8px', borderRadius: '12px', background: '#fff5f5', color: '#cc5c5c', border: '1px solid #e8b4b4' }
);

// ===== 样式函数 =====
const tabStyle = (patientId) => ({
  padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap',
  fontWeight: activePatientId.value === patientId ? '600' : '400',
  background: activePatientId.value === patientId ? '#cc5c5c' : '#f5f5f5',
  color: activePatientId.value === patientId ? 'white' : '#555',
  border: activePatientId.value === patientId ? '1px solid #cc5c5c' : '1px solid #ddd',
  transition: 'all 0.2s'
});

const rangeBtn = (m) => ({
  padding: '4px 8px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', border: '1px solid',
  borderColor: dateRangeMonths.value === m ? '#cc5c5c' : '#ddd',
  background: dateRangeMonths.value === m ? '#fff5f5' : '#f5f5f5',
  color: dateRangeMonths.value === m ? '#cc5c5c' : '#666',
  fontWeight: dateRangeMonths.value === m ? '600' : '400'
});

const reportBtnStyle = (id, type) => {
  const selected = selectedReportId.value === id;
  return {
    padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
    fontWeight: '500', whiteSpace: 'nowrap', transition: 'all 0.2s',
    background: selected ? (type === 'bodyFluid' ? '#2e7d32' : '#cc5c5c') : (type === 'bodyFluid' ? '#e8f5e9' : '#fff5f5'),
    border: `1px solid ${selected ? (type === 'bodyFluid' ? '#2e7d32' : '#cc5c5c') : (type === 'bodyFluid' ? '#a5d6a7' : '#e8b4b4')}`,
    color: selected ? 'white' : (type === 'bodyFluid' ? '#2e7d32' : '#cc5c5c')
  };
};

// ===== 操作函数 =====
const switchPatient = (id) => {
  activePatientId.value = id;
  selectedReportId.value = null;
  trendItem.value = '';
  aiResult.value = '';
  aiError.value = '';
};

const selectReport = (id) => {
  selectedReportId.value = id;
  trendItem.value = '';
  aiResult.value = '';
  aiError.value = '';
  aiLoading.value = false;
};

const setDateRange = (months) => {
  dateRangeMonths.value = months;
  // 【修复】切换日期范围时清空选中报告，避免显示不在筛选范围内的报告
  selectedReportId.value = null;
  trendItem.value = '';
  aiResult.value = '';
  aiError.value = '';
  if (months === 0) { filterDateStart.value = ''; filterDateEnd.value = ''; return; }
  const end = new Date(), start = new Date();
  start.setMonth(start.getMonth() - months);
  // 【修复】使用本地日期格式 YYYY-MM-DD，避免 toISOString 的 UTC 转换问题
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  filterDateEnd.value = fmt(end);
  filterDateStart.value = fmt(start);
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
        const ocrResult = await performOCR(file);
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

// ===== OCR =====
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

// ===== 日期/名称识别工具 =====
const selectLabReportDate = (ocrText, dates) => {
  if (!ocrText) return dates?.length ? dates[dates.length - 1] : null;
  const priorityKeywords = ['采样时间', '采集时间', '接收时间', '检验时间', '申请时间', '报告时间'];
  const lines = ocrText.split('\n');
  for (const keyword of priorityKeywords) {
    for (const line of lines) {
      if (!line.includes(keyword)) continue;
      const m = line.match(/(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})/);
      if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    }
  }
  return dates?.length ? dates[dates.length - 1] : null;
};

const extractDateFromFilename = (filename) => {
  if (!filename) return null;
  const m = filename.match(/(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
};


const extractTestNameFromFilename = (filename) => {
  if (!filename) return { matched: null, hint: '' };
  const cleaned = filename.replace(/\d{8,}/, '').replace(/\.[^.]+$/, '').trim();
  const keywords = ['血常规', '尿常规', '肝功能', '肾功能', '血脂', '甲功', '血糖', '凝血', '电解质', '大便常规', '粪便常规'];
  for (const k of keywords) {
    if (cleaned.includes(k)) return { matched: k, hint: k };
  }
  return { matched: null, hint: cleaned };
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
      try { await apiRequest(`/lab-reports/${selectedReport.value.backendId}`, { method: 'DELETE' }); } catch (_) {}
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
    const res = await apiRequest('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ type: 'lab', data: dataText, title: selectedReport.value.testName || '', patientName: patient?.name || '未知' })
    });
    if (res.code === 200 && res.data) { aiResult.value = res.data; }
    else throw new Error(res.message || 'AI分析失败');
  } catch (err) {
    aiError.value = '分析失败: ' + err.message;
  } finally {
    aiLoading.value = false;
  }
};

// ===== 趋势图 =====
const renderTrendChart = async () => {
  const itemName = trendItem.value;
  if (!itemName || !activePatientId.value) return;
  // Chart.js is now imported locally, no need for CDN loading
  const sel = selectedReport.value;
  const isFluid = isBodyFluid(sel);
  const reports = labStore.getPatientReports(activePatientId.value).filter(r => isBodyFluid(r) === isFluid);
  const dataPoints = []; let unit = '', refMin = null, refMax = null;
  reports.forEach(r => {
    (r.tableData || []).forEach(row => {
      if (row.itemName !== itemName || !row.result || row.resultPrefix) return;
      const val = parseFloat(row.result);
      if (isNaN(val)) return;
      dataPoints.push({ date: r.date, value: val, flag: row.flag });
      if (!unit && row.unit) unit = row.unit;
      if (row.refMin != null) refMin = row.refMin;
      if (row.refMax != null) refMax = row.refMax;
      if ((refMin === null || refMax === null) && row.refRange) {
        const m = row.refRange.match(/^([<>]?\d+\.?\d*)\s*[-~—–]+\s*([<>]?\d+\.?\d*)/);
        if (m) { refMin = parseFloat(m[1]); refMax = parseFloat(m[2]); }
      }
    });
  });
  if (dataPoints.length === 0) { ElMessage.warning(`未找到"${itemName}"的数值数据`); return; }
  dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));
  let recent = dataPoints.slice(-10);
  if (recent.length === 1) recent = [recent[0], { ...recent[0] }];
  const allVals = recent.map(d => d.value);
  const dataMin = Math.min(...allVals), dataMax = Math.max(...allVals);
  let yMin = 0, yMax = 10;
  if (refMax !== null) { yMin = Math.max(0, refMin !== null ? Math.min(refMin * 0.5, dataMin * 0.85) : dataMin * 0.7); yMax = Math.max(refMax * 1.5, dataMax * 1.15); }
  else { yMin = Math.max(0, dataMin * 0.7); yMax = dataMax * 1.3; }
  if (yMax < dataMax) yMax = dataMax * 1.15;
  await nextTick();
  const canvas = trendCanvasRef.value;
  if (!canvas) return;
  if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }
  const COLOR_HIGH = '#FF0000', COLOR_LOW = '#30CC00', COLOR_NORMAL = '#333333';
  const pointColors = recent.map(d => d.flag === '↑' ? COLOR_HIGH : d.flag === '↓' ? COLOR_LOW : COLOR_NORMAL);
  const datasets = [{
    label: itemName, data: recent.map(d => d.value),
    borderColor: COLOR_NORMAL, backgroundColor: 'rgba(51,51,51,0.05)', borderWidth: 2,
    pointBackgroundColor: pointColors, pointBorderColor: pointColors,
    pointRadius: 5, pointHoverRadius: 7, tension: 0.3, fill: false,
    segment: { borderColor: (c) => { const p0 = pointColors[c.p0DataIndex], p1 = pointColors[c.p1DataIndex]; return p1 !== COLOR_NORMAL ? p1 : p0; } }
  }];
  if (refMin !== null && refMax !== null) {
    datasets.push({ label: '参考上限', data: recent.map(() => refMax), borderColor: 'rgba(150,150,150,0.6)', borderWidth: 1, borderDash: [5,5], pointRadius: 0, fill: false });
    datasets.push({ label: '参考下限', data: recent.map(() => refMin), borderColor: 'rgba(150,150,150,0.6)', borderWidth: 1, borderDash: [5,5], pointRadius: 0, fill: { target: '-1', above: 'rgba(180,180,180,0.18)' } });
  } else if (refMax !== null) {
    datasets.push({ label: '参考上限', data: recent.map(() => refMax), borderColor: 'rgba(150,150,150,0.6)', borderWidth: 1, borderDash: [5,5], pointRadius: 0, fill: false });
  }
  const dataLabelPlugin = {
    id: 'dataLabels',
    afterDatasetsDraw(chart) {
      const ctx2 = chart.ctx, meta = chart.getDatasetMeta(0);
      if (!meta || meta.hidden) return;
      const n = meta.data.length, fs = n <= 4 ? 12 : n <= 7 ? 11 : 10;
      ctx2.save(); ctx2.font = `600 ${fs}px -apple-system, sans-serif`; ctx2.textAlign = 'center';
      meta.data.forEach((pt, idx) => {
        const v = chart.data.datasets[0].data[idx];
        if (v === null || v === undefined) return;
        const { chartArea } = chart;
        const nearTop = (pt.y - chartArea.top) < 30, nearBottom = (chartArea.bottom - pt.y) < 30;
        let offsetY, baseline;
        if (nearTop) { offsetY = 14; baseline = 'top'; }
        else if (nearBottom) { offsetY = -10; baseline = 'bottom'; }
        else { offsetY = idx % 2 === 0 ? -10 : 14; baseline = idx % 2 === 0 ? 'bottom' : 'top'; }
        const text = String(v), tw = ctx2.measureText(text).width;
        const bgY = baseline === 'bottom' ? pt.y + offsetY - fs - 2 : pt.y + offsetY - 2;
        ctx2.fillStyle = 'rgba(255,255,255,0.85)';
        ctx2.fillRect(pt.x - tw / 2 - 3, bgY, tw + 6, fs + 4);
        ctx2.textBaseline = baseline;
        ctx2.fillStyle = pointColors[idx] || COLOR_NORMAL;
        ctx2.fillText(text, pt.x, pt.y + offsetY);
      });
      ctx2.restore();
    }
  };
  trendChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: recent.map(d => formatDate(d.date)), datasets },
    plugins: [dataLabelPlugin],
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { title: { display: true, text: `${itemName}${unit ? ' (' + unit + ')' : ''}`, font: { size: 14, weight: '600' }, color: '#333' }, legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        y: { min: yMin, max: yMax, title: { display: true, text: unit || '数值', font: { size: 12 } }, grid: { color: 'rgba(0,0,0,0.06)' } },
        x: { title: { display: true, text: '检验日期', font: { size: 12 } }, grid: { display: false } }
      }
    }
  });
};

watch(selectedReport, () => { trendItem.value = ''; if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; } });

// ===== 表格美化辅助函数 =====
const rowHighlightClass = (row) => {
  if (row.flag === '↑') return 'row-high';
  if (row.flag === '↓') return 'row-low';
  return 'row-normal';
};

const rowHighlightStyle = (row) => {
  if (!row.flag) {
    return {};
  }
  return {};
};

const resultValueClass = (row) => {
  if (row.flag === '↑') return 'result-high';
  if (row.flag === '↓') return 'result-low';
  return 'result-normal';
};

const calcBarWidth = (row) => {
  if (row.resultPrefix) return null;
  const val = parseFloat(row.result);
  if (isNaN(val)) return null;
  const min = row.refMin != null ? row.refMin : (() => {
    if (!row.refRange) return null;
    const m = row.refRange.match(/^([<>]?\d+\.?\d*)\s*[-~—–]+\s*([<>]?\d+\.?\d*)/);
    return m ? parseFloat(m[1]) : null;
  })();
  const max = row.refMax != null ? row.refMax : (() => {
    if (!row.refRange) return null;
    const m = row.refRange.match(/^([<>]?\d+\.?\d*)\s*[-~—–]+\s*([<>]?\d+\.?\d*)/);
    return m ? parseFloat(m[2]) : null;
  })();
  if (min == null || max == null || max <= min) return null;
  const range = max - min;
  const padding = range * 0.4;
  const trackMin = min - padding;
  const trackMax = max + padding;
  return Math.max(2, Math.min(98, ((val - trackMin) / (trackMax - trackMin)) * 100));
};

const barFillClass = (row) => {
  if (row.flag === '↑') return 'bar-high';
  if (row.flag === '↓') return 'bar-low';
  return 'bar-ok';
};
</script>

<style scoped>
.th-cell { padding: 10px 12px; text-align: left; border-bottom: 2px solid #ccc; font-weight: 600; color: #444; white-space: nowrap; }
.td-cell { padding: 8px 12px; border-bottom: 1px solid #eee; }

/* ===== 异常行高亮 ===== */
.row-high { background: #fff5f5 !important; border-left: 3px solid #ef4444; }
.row-low  { background: #f0f7ff !important; border-left: 3px solid #3b82f6; }
.row-normal { border-left: 3px solid transparent; }

/* ===== 结果值样式 ===== */
.result-cell { vertical-align: middle; }
.result-value { font-weight: 700; font-size: 14px; display: block; line-height: 1.3; }
.result-high { color: #dc2626; }
.result-low  { color: #2563eb; }
.result-normal { color: #1e2d4a; }

/* ===== 进度条 ===== */
.result-bar-wrap { margin-top: 4px; }
.result-bar-track {
  position: relative;
  height: 5px;
  background: #e5e7eb;
  border-radius: 99px;
  overflow: hidden;
  width: 100%;
  min-width: 60px;
}
.result-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
}
.bar-high  { background: linear-gradient(90deg, #fca5a5, #ef4444); }
.bar-low   { background: linear-gradient(90deg, #93c5fd, #3b82f6); }
.bar-ok    { background: linear-gradient(90deg, #6ee7b7, #10b981); }

/* ===== 标志徽标 ===== */
.flag-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px; height: 26px;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 800;
}
.flag-high { background: #fee2e2; color: #dc2626; }
.flag-low  { background: #dbeafe; color: #2563eb; }

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

/* ===== Step4: 左右分栏垂直堆叠 + 高度自适应 ===== */
@media (max-width: 768px) {
  div[style*="display:flex; gap:16px; min-height:480px"] {
    flex-direction: column !important;
    min-height: auto !important;
  }
  div[style*="display:flex; gap:16px; min-height:480px"] > div {
    min-height: 40vh !important;
  }
}
@media (max-width: 576px) {
  div[style*="display:flex; gap:16px; min-height:480px"] > div {
    min-height: 35vh !important;
  }
}

/* 表格横向滚动 */
@media (max-width: 768px) {
  .el-table { font-size: 13px; }
  .th-cell, .td-cell { padding: 6px 8px; font-size: 12px; }
}
</style>

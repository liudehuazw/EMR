<template>
  <div class="invoice-layout">
    <!-- 左侧患者列表 -->
    <div class="patient-sidebar">
      <div class="sidebar-title">患者列表</div>
      <div v-for="p in patientsStore.patients" :key="'inv-p-' + p.id"
        @click="switchPatient(p.id)" :style="sidebarItemStyle(p.id)">
        {{ p.name }}
        <span v-if="invoiceStore.getPatientInvoices(p.id).length > 0" style="font-size:11px; opacity:0.7;">
          ({{ invoiceStore.getPatientInvoices(p.id).length }})
        </span>
      </div>
    </div>

    <!-- 右侧内容区 -->
    <div v-if="activePatientId" class="invoice-main">
      <!-- 顶部工具栏 -->
      <div class="toolbar-card">
        <!-- 左侧时间筛选 -->
        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <div style="display:flex; gap:4px;">
            <button v-for="m in [1,3,6,12]" :key="m" @click="setDateRange(m)" :style="rangeBtn(m)">
              近{{ m === 12 ? '1年' : m + '个月' }}
            </button>
          </div>
          <div style="display:flex; align-items:center; gap:4px; font-size:13px; color:#555;">
            <span>📅</span>
            <input type="date" v-model="filterDateStart" @change="dateRangeMonths = 0"
              style="border:1px solid #ddd; border-radius:4px; padding:4px 8px; font-size:12px; outline:none;">
            <span>至</span>
            <input type="date" v-model="filterDateEnd" @change="dateRangeMonths = 0"
              style="border:1px solid #ddd; border-radius:4px; padding:4px 8px; font-size:12px; outline:none;">
          </div>
          <button v-if="filterDateStart || filterDateEnd" @click="clearFilter"
            style="padding:4px 10px; background:#f5f5f5; border:1px solid #ddd; border-radius:4px; cursor:pointer; font-size:12px; color:#666;">
            ✕ 清除
          </button>
        </div>
        <!-- 右侧操作按钮 -->
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <el-button type="danger" @click="triggerUpload">📤 上传发票</el-button>
          <el-button v-if="filteredInvoices.length > 0" type="primary" @click="downloadAll" :loading="downloadAllLoading">📥 全部下载</el-button>
          <el-button v-if="filteredInvoices.length > 0" type="warning" @click="batchReparse">🔄 批量解析</el-button>
          <el-button v-if="filteredInvoices.length > 0" type="danger" @click="batchDelete">🗑️ 批量删除</el-button>
        </div>
      </div>

      <!-- 费用汇总 -->
      <div v-if="filteredInvoices.length > 0" class="summary-card">
        <div class="summary-item">
          <span style="font-size:22px;">💰</span>
          <div>
            <div class="summary-label">总计金额</div>
            <div class="summary-value" style="color:#d03050;">¥{{ totalAmount }}</div>
          </div>
        </div>
        <div class="summary-item">
          <span style="font-size:22px;">🧾</span>
          <div>
            <div class="summary-label">发票数量</div>
            <div class="summary-value">{{ filteredInvoices.length }} 张</div>
          </div>
        </div>
        <div class="summary-item">
          <span style="font-size:22px;">💊</span>
          <div>
            <div class="summary-label">自付金额</div>
            <div class="summary-value" style="color:#e67e22;">¥{{ selfPayAmount }}</div>
          </div>
        </div>
        <div v-if="duplicateCount > 0" class="summary-item" style="background:#fdf6ec; border:1px solid #f5dab1; border-radius:8px; padding:8px 12px;">
          <span style="font-size:18px;">⚠️</span>
          <div>
            <div style="font-size:11px; color:#e6a23c;">疑似重复</div>
            <div style="font-size:16px; font-weight:700; color:#e6a23c;">{{ duplicateCount }} 张</div>
          </div>
        </div>
        <div v-if="anomalyCount > 0" class="summary-item anomaly-badge">
          <span style="font-size:18px;">❗</span>
          <div>
            <div style="font-size:11px; color:#d03050;">异常提醒</div>
            <div style="font-size:16px; font-weight:700; color:#d03050;">{{ anomalyCount }} 条</div>
          </div>
        </div>
      </div>

      <!-- 发票列表 -->
      <div class="invoice-list">
        <div v-if="filteredInvoices.length === 0" style="text-align:center; color:#888; padding:3rem;">
          <div style="font-size:3rem; margin-bottom:1rem;">🧾</div>
          <p>暂无发票，点击"上传发票"添加</p>
        </div>

        <div v-for="inv in filteredInvoices" :key="'inv-' + inv.id" class="invoice-card">
          <!-- 发票头部 -->
          <div class="invoice-header">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <span style="font-size:13px; color:#888;">📅 {{ inv.date }}</span>
              <span style="font-size:14px; font-weight:600; color:#333;">{{ inv.title || inv.fileName }}</span>
              <!-- Duplicate warning -->
              <el-tooltip v-if="duplicateMap[inv.id]"
                :content="duplicateMap[inv.id] === 'number' ? '发票号码重复，疑似重复上传同一张发票' : '日期与金额均重复，同日同金额可能重复（同日多科室挂号除外）'"
                placement="top">
                <span style="color:#e6a23c; font-size:12px; background:#fdf6ec; padding:1px 8px; border-radius:10px; border:1px solid #f5dab1; cursor:help;">⚠️ 疑似重复</span>
              </el-tooltip>
              <!-- 异常标记 -->
              <el-popover v-if="Array.isArray(inv.items) && getAnomalies(inv).length > 0" placement="top" :width="280" trigger="hover">
                <template #reference>
                  <span style="color:#d03050; font-size:16px; font-weight:700; cursor:pointer;">❗</span>
                </template>
                <div>
                  <div v-for="(a, idx) in getAnomalies(inv)" :key="idx"
                    style="font-size:13px; color:#d03050; padding:4px 0; border-bottom:1px solid #fee;">
                    {{ a }}
                  </div>
                </div>
              </el-popover>
              <!-- 关联病历按钮 -->
              <span v-if="findLinkedRecord(activePatientId, inv.date)"
                @click="jumpToLinkedRecord(activePatientId, inv.date)"
                style="font-size:11px; background:#e3f2fd; color:#1976d2; padding:2px 8px; border-radius:10px; cursor:pointer; border:1px solid #bbdefb;"
                title="点击查看关联病历">
                📋 关联病历 →
              </span>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:16px; font-weight:700; color:#d03050;">¥{{ inv.totalAmount || '0.00' }}</span>
              <span v-if="inv.selfPayAmount" style="font-size:12px; color:#e67e22; background:#fff3e0; padding:1px 6px; border-radius:8px;">自付¥{{ inv.selfPayAmount }}</span>
              <span v-if="inv.insuranceAmount" style="font-size:12px; color:#1976d2; background:#e3f2fd; padding:1px 6px; border-radius:8px;">医保¥{{ inv.insuranceAmount }}</span>
              <el-button size="small" type="primary" @click="previewInvoice(inv)">🔍 预览</el-button>
              <el-button size="small" type="success" @click="downloadInvoice(inv)">📥 下载</el-button>
              <el-button size="small" type="warning" @click="reparseInvoice(inv)">🔄 重新解析</el-button>
              <el-button size="small" @click="deleteInvoice(inv.id)">🗑️</el-button>
            </div>
          </div>

          <!-- 项目明细 -->
          <div v-if="Array.isArray(inv.items) && inv.items.length > 0" style="padding:12px 16px;">
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <thead>
                <tr style="background:#f8f9fa;">
                  <th style="text-align:left; padding:6px 10px; color:#555; font-weight:600; border-bottom:1px solid #eee;">项目名称</th>
                  <th style="text-align:right; padding:6px 10px; color:#555; font-weight:600; border-bottom:1px solid #eee;">金额</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in inv.items" :key="idx" :style="{ background: idx % 2 === 0 ? 'white' : '#fafafa' }">
                  <td style="padding:5px 10px; color:#333; border-bottom:1px solid #f0f0f0;">{{ item?.name }}</td>
                  <td style="padding:5px 10px; color:#333; text-align:right; border-bottom:1px solid #f0f0f0;">¥{{ item?.amount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else style="padding:8px 16px; font-size:12px; color:#aaa; font-style:italic;">暂无项目明细（OCR未识别到）</div>
        </div>
      </div>
    </div>

    <!-- 未选患者 -->
    <div v-else class="invoice-empty">
      <div style="font-size:3rem;">👆</div>
      <p>请先选择一位患者</p>
    </div>

    <!-- 发票预览弹窗 -->
    <el-dialog v-model="previewVisible" title="🔍 发票预览" width="90vw" style="max-width:900px;">
      <div style="background:#f5f5f5; display:flex; align-items:center; justify-content:center; min-height:60vh; border-radius:8px; overflow:hidden;">
        <iframe v-if="previewIsPdf" :src="previewUrl" style="width:100%; height:70vh; border:none;" />
        <img v-else :src="previewUrl" style="max-width:100%; max-height:70vh; object-fit:contain; border-radius:8px;" />
      </div>
      <template #footer>
        <el-button @click="window.open(previewUrl, '_blank')">↗ 新窗口打开</el-button>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- Linked record preview dialog (in-place, no routing) -->
    <FilePreviewDialog
      v-model="linkedRecordVisible"
      :files="linkedRecordFiles"
      :patient="linkedRecordPatient"
      :record="linkedRecordRecord"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { usePatientsStore } from '@/stores/usePatients';
import { useInvoiceStore } from '@/stores/useInvoice';
import { useRecordsStore } from '@/stores/useRecords';
import { apiRequest, uploadFileToCloud } from '@/api/index';
import FilePreviewDialog from '@/components/FilePreviewDialog.vue';

const router = useRouter();
const route = useRoute();
const patientsStore = usePatientsStore();
const invoiceStore = useInvoiceStore();
const recordsStore = useRecordsStore();

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
const filterDateStart = ref('');
const filterDateEnd = ref('');
const dateRangeMonths = ref(0);
const previewVisible = ref(false);
const previewUrl = ref('');
const previewIsPdf = ref(false);

// ===== Computed =====
const filteredInvoices = computed(() => {
  let list = activePatientId.value ? invoiceStore.getPatientInvoices(activePatientId.value) : [];
  if (filterDateStart.value) list = list.filter(inv => inv.date >= filterDateStart.value);
  if (filterDateEnd.value) list = list.filter(inv => inv.date <= filterDateEnd.value);
  return list;
});

const totalAmount = computed(() =>
  filteredInvoices.value.reduce((s, i) => s + parseFloat(i.totalAmount || 0), 0).toFixed(2)
);
const selfPayAmount = computed(() =>
  filteredInvoices.value.reduce((s, i) => s + parseFloat(i.selfPayAmount || 0), 0).toFixed(2)
);
const anomalyCount = computed(() =>
  filteredInvoices.value.reduce((s, i) => s + (Array.isArray(i.items) ? getAnomalies(i).length : 0), 0)
);

// ===== Duplicate invoice detection =====
// Rules:
// 1. Invoice number (title "发票-XXXX") duplicate → confirmed duplicate (highest priority)
// 2. Date duplicate AND amount duplicate simultaneously → confirmed duplicate
// 3. Exclusion: if invoice number exists and is unique → NOT duplicate, even if date+amount match
const duplicateMap = computed(() => {
  const map = {};
  const invoices = filteredInvoices.value;

  // Extract invoice number from title (e.g. "发票-123456" → "123456")
  const getInvoiceNo = (inv) => {
    const m = (inv.title || '').match(/^发票-(.+)$/);
    return m ? m[1].trim() : null;
  };

  // Step 1: group by invoice number
  const numberGroups = {};
  const numberDupSet = new Set(); // ids whose invoice number is duplicated
  invoices.forEach(inv => {
    const no = getInvoiceNo(inv);
    if (no) {
      if (!numberGroups[no]) numberGroups[no] = [];
      numberGroups[no].push(inv.id);
    }
  });
  Object.values(numberGroups).filter(g => g.length > 1).forEach(g =>
    g.forEach(id => { map[id] = 'number'; numberDupSet.add(id); })
  );

  // Step 2: group by date, group by amount separately, then intersect
  const dateGroups = {};
  const amountGroups = {};
  invoices.forEach(inv => {
    if (inv.date) {
      if (!dateGroups[inv.date]) dateGroups[inv.date] = [];
      dateGroups[inv.date].push(inv.id);
    }
    const amt = parseFloat(inv.totalAmount || 0);
    if (amt > 0) {
      const amtKey = amt.toFixed(2);
      if (!amountGroups[amtKey]) amountGroups[amtKey] = [];
      amountGroups[amtKey].push(inv.id);
    }
  });
  const dateDupIds = new Set();
  const amountDupIds = new Set();
  Object.values(dateGroups).filter(g => g.length > 1).forEach(g => g.forEach(id => dateDupIds.add(id)));
  Object.values(amountGroups).filter(g => g.length > 1).forEach(g => g.forEach(id => amountDupIds.add(id)));

  // Only mark as duplicate if BOTH date and amount are duplicated
  // Exclusion: if the invoice has a unique invoice number, skip it
  invoices.forEach(inv => {
    if (map[inv.id]) return; // already marked by invoice number
    const no = getInvoiceNo(inv);
    // If this invoice has an invoice number and it's NOT in numberDupSet → unique number → exclude
    if (no && !numberDupSet.has(inv.id)) return;
    // Both date and amount duplicated simultaneously → duplicate
    if (dateDupIds.has(inv.id) && amountDupIds.has(inv.id)) {
      map[inv.id] = 'date+amount';
    }
  });

  return map;
});
const duplicateCount = computed(() => Object.keys(duplicateMap.value).length);

// ===== 异常检测 =====
const getAnomalies = (invoice) => {
  const anomalies = [];
  if (parseFloat(invoice.totalAmount || 0) > 2000) {
    anomalies.push(`大额费用提醒：本张发票合计 ¥${invoice.totalAmount}`);
  }
  // 【修复】确保 items 是数组再调用 forEach
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  if (items.length > 0) {
    const nameCount = {};
    items.forEach(item => {
      const name = item?.name?.trim();
      if (name) nameCount[name] = (nameCount[name] || 0) + 1;
    });
    Object.entries(nameCount).forEach(([name, count]) => {
      if (count > 1) anomalies.push(`同项目重复收费：${name} 出现 ${count} 次`);
    });
  }
  return anomalies;
};

// ===== 样式 =====
const sidebarItemStyle = (id) => ({
  padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '4px',
  fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  background: activePatientId.value === id ? '#fff0f0' : 'transparent',
  color: activePatientId.value === id ? '#d03050' : '#333',
  fontWeight: activePatientId.value === id ? '600' : '400',
  borderLeft: activePatientId.value === id ? '3px solid #d03050' : '3px solid transparent'
});
const rangeBtn = (m) => ({
  padding: '4px 8px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', border: '1px solid',
  borderColor: dateRangeMonths.value === m ? '#d03050' : '#ddd',
  background: dateRangeMonths.value === m ? '#fff0f0' : '#f5f5f5',
  color: dateRangeMonths.value === m ? '#d03050' : '#666',
  fontWeight: dateRangeMonths.value === m ? '600' : '400'
});

// ===== 操作 =====
const switchPatient = (id) => { activePatientId.value = id; };
const setDateRange = (m) => {
  dateRangeMonths.value = m;
  const end = new Date(), start = new Date();
  start.setMonth(start.getMonth() - m);
  // 【修复】使用本地日期格式，避免 toISOString 的 UTC 转换问题
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  filterDateEnd.value = fmt(end);
  filterDateStart.value = fmt(start);
};
const clearFilter = () => { filterDateStart.value = ''; filterDateEnd.value = ''; dateRangeMonths.value = 0; };

// ===== 上传 =====
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
    let successCount = 0;
    const totalFiles = validFiles.length;
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      console.log(`\n=== 发票 [${i + 1}/${totalFiles}]: ${file.name} ===`);
      if (i > 0) {
        console.log('等待3秒让OCR服务器释放内存...');
        await new Promise(r => setTimeout(r, 3000));
      }
      try {
        ElMessage.info(`正在上传 ${file.name}...`);
        console.log('[Invoice Upload] Step 1: Uploading file to cloud...');
        const fileUrl = await uploadFileToCloud(file, 'invoices');
        console.log('[Invoice Upload] Step 2: File uploaded, URL:', fileUrl);
        
        console.log('[Invoice Upload] Step 3: Performing OCR...');
        const ocrResult = await performOCR(file);
        console.log(`发票OCR结果 [${i + 1}/${totalFiles}] [${file.name}]:`, ocrResult.text);
        
        const { totalAmount, selfPayAmount, insuranceAmount, items } = extractInvoiceAmounts(ocrResult.text || '');
        console.log('[Invoice Upload] Step 5: Extracted amounts:', { totalAmount, selfPayAmount, insuranceAmount, items });
        
        const invoiceDate = extractInvoiceDate(ocrResult.text || '', ocrResult.extractedDates || [], file.name);
        const invoiceNumber = extractInvoiceNumber(ocrResult.text || '');
        const title = invoiceNumber ? `发票-${invoiceNumber}` : file.name.replace(/\.[^.]+$/, '');
        if (!totalAmount) ElMessage.warning(`${file.name} 未识别到金额，金额显示为0`);
        
        console.log('[Invoice Upload] Step 6: Creating invoice object...');
        const newInvoice = {
          id: Date.now() + i + Math.random(),
          patientId: activePatientId.value,
          date: invoiceDate, title,
          fileName: file.name, fileType: file.type, fileUrl,
          totalAmount: parseFloat(totalAmount || 0).toFixed(2),
          selfPayAmount: selfPayAmount || '', insuranceAmount: insuranceAmount || '',
          items, ocrRawText: ocrResult.text, uploadTime: Date.now()
        };
        // 【修复】同步到后端数据库，字段名与后端实体匹配
        console.log('[Invoice Upload] Step 7: Syncing to backend...');
        try {
          const backendInvoice = {
            patientId: newInvoice.patientId,
            invoiceDate: newInvoice.date, // 后端使用 invoiceDate
            title: newInvoice.title,
            fileName: newInvoice.fileName,
            fileType: newInvoice.fileType,
            fileUrl: newInvoice.fileUrl,
            totalAmount: newInvoice.totalAmount,
            selfPayAmount: newInvoice.selfPayAmount,
            insuranceAmount: newInvoice.insuranceAmount,
            items: JSON.stringify(newInvoice.items), // 后端 items 是 JSON 字符串
            ocrRawText: newInvoice.ocrRawText,
            uploadTime: new Date(newInvoice.uploadTime).toISOString()
          };
          console.log('[Invoice Upload] Step 8: Backend payload:', backendInvoice);
          const res = await apiRequest('/invoices', {
            method: 'POST',
            body: JSON.stringify(backendInvoice)
          });
          console.log('[Invoice Upload] Step 9: Backend response:', res);
          if (res.code === 200 && res.data) {
            // 使用后端返回的数据（包含生成的ID）
            newInvoice.backendId = res.data.id;
            console.log('[Invoice Upload] Step 10: Backend sync success, ID:', res.data.id);
          } else {
            console.warn('[Invoice Upload] Step 10: Backend sync failed:', res);
          }
        } catch (e) {
          console.warn('[Invoice Upload] Step 10: Backend sync error:', e);
        }
        console.log('[Invoice Upload] Step 11: Adding to local store...');
        invoiceStore.addInvoice(newInvoice);
        console.log('[Invoice Upload] Step 12: Success! Invoice saved:', newInvoice.id);
        console.log(`=== 发票处理完成: ${file.name} (¥${totalAmount}, ${invoiceDate}) ===\n`);
        successCount++;
      } catch (err) {
        console.error(`发票上传失败: ${file.name}`, err);
        ElMessage.error(`"${file.name}" 上传失败: ${err.message}`);
      }
    }
    if (successCount > 0) ElMessage.success(`成功上传 ${successCount}/${validFiles.length} 张发票`);
  };
  input.click();
};

// ===== OCR（直接上传，后端处理PDF分页）=====
// NOTE: Multi-page PDF OCR takes ~10min on 2GB server, timeout set to 12min
const performOCR = async (file, maxRetries = 1) => {
  const token = localStorage.getItem('emr_token');
  const formData = new FormData();
  formData.append('file', file);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 720000); // 12 min timeout
      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`OCR HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'OCR失败');
      return data.data;
    } catch (err) {
      // Do NOT retry on timeout/504 — OCR is still processing on server
      const isTimeout = err.name === 'AbortError' || (err.message && err.message.includes('504'));
      if (!isTimeout && attempt < maxRetries) {
        console.warn(`[OCR] 尝试${attempt + 1}失败，${2000 * (attempt + 1)}ms后重试...`, err);
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
};

// ===== 发票信息提取（强化版，移植自旧版前端，支持电子发票+医疗收费票据双模式）=====

// 电子发票（增值税发票）专用解析
const extractElectronicInvoice = (ocrText) => {
  const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
  let totalAmount = '';
  const items = [];

  const cleanAmount = (str) => {
    const v = parseFloat(str.replace(/[¥￥,，\s]/g, ''));
    return isNaN(v) ? null : v.toFixed(2);
  };
  const extractAmt = (text) => {
    const m = text.match(/([¥￥]?[\d,，]+\.\d{2})\s*$/);
    if (m) return cleanAmount(m[1]);
    return null;
  };
  const TAX_EXCLUDE = /税额|免税|税率|征收率|价税合计|合计|大写|小写|备注|发票专用章|开票人|销售方|购买方/;
  // 【修复】智能提取项目名称：根据*后面内容的特征决定提取方式
  const cleanItemName = (name) => {
    const afterStar = name.replace(/^\*[^*]+\*/, '').trim();
    const match = name.match(/^\*([^*]+)\*/);
    const inStar = match ? match[1].trim() : '';
    
    // 如果*后面的内容包含数字、英文或特殊符号，说明是规格型号，提取*...*中的分类名称
    if (afterStar && /[\d\w]/.test(afterStar)) {
      return inStar || name.trim();
    }
    // 否则提取*后面的具体产品名称
    return afterStar || inStar || name.trim();
  };

  // 【新增】电子税务发票专用：检测表格格式发票（有项目名称、数量、单价、金额等表头）
  const hasTableHeaders = /项目名称|规格型号|单位|数量|单价|金额/.test(ocrText);
  console.log('[Electronic Invoice] Table headers detected:', hasTableHeaders);

  if (hasTableHeaders) {
    // 表格格式：项目名称、数量、单价、金额分行显示
    let currentName = '';
    let inItemSection = false;
    
    // 扩展金额提取函数，支持更多格式
    const extractAmtExtended = (text) => {
      // 匹配 ￥2345.13 或 2345.13
      const m1 = text.match(/[￥¥]?[\d,，]+\.\d{2}/);
      if (m1) {
        const v = parseFloat(m1[0].replace(/[￥¥,，]/g, ''));
        return isNaN(v) ? null : v.toFixed(2);
      }
      // 匹配纯数字（可能是金额）
      const m2 = text.match(/^[\d,，]+\.\d{2}$/);
      if (m2) {
        const v = parseFloat(m2[0].replace(/[,，]/g, ''));
        return isNaN(v) ? null : v.toFixed(2);
      }
      return null;
    };
    
    lines.forEach((line, idx) => {
      // 检测进入项目明细区域
      if (!inItemSection && /项目名称/.test(line)) {
        inItemSection = true;
        return;
      }
      
      // 检测离开项目明细区域（遇到合计等）
      if (inItemSection && /合\s*计/.test(line)) {
        inItemSection = false;
        return;
      }
      
      if (!inItemSection) return;
      
      // 跳过表头行和单位行
      if (/项目名称|规格型号|单位|数量|单价|金额税率|征收率|税额|支|瓶|盒|袋|粒|片/.test(line)) return;
      
      // 检测项目名称行（以*开头）
      if (/^\*[^*]+\*/.test(line)) {
        currentName = cleanItemName(line);
        console.log('[Electronic Invoice] Found item name:', currentName);
        console.log('[Electronic Invoice] Line content:', line);
        
        // 【修复】直接使用价税合计作为项目金额
        // 电子税务发票的项目金额应该是价税合计，而不是单独的金额
      }
    });
    
    // 【修复】提取价税合计作为总金额（只在表格格式中）
    lines.forEach((line, idx) => {
      if (!totalAmount && /价税合计.*大写/.test(line)) {
        const nextLine = lines[idx + 1];
        if (nextLine && /[（(]小写[)）]/.test(nextLine)) {
          const amt = extractAmt(nextLine);
          if (amt) {
            totalAmount = amt;
            console.log('[Electronic Invoice] Tax total amount found:', totalAmount);
          }
        }
      }
      if (!totalAmount && /[（(]小写[)）].*￥/.test(line)) {
        const amt = extractAmt(line);
        if (amt) {
          totalAmount = amt;
          console.log('[Electronic Invoice] Tax total amount found:', totalAmount);
        }
      }
    });
    
    // 【修复】将项目名称和价税合计组合
    console.log('[Electronic Invoice] Before items push - currentName:', currentName, 'totalAmount:', totalAmount);
    if (currentName && totalAmount) {
      items.push({ name: currentName, amount: totalAmount });
      console.log('[Electronic Invoice] Table item extracted:', currentName, totalAmount);
    } else {
      console.log('[Electronic Invoice] Items push skipped - currentName:', currentName, 'totalAmount:', totalAmount);
    }
    
    // 【修复】确保selfPayAmount是总金额（含税），而不是排除税额
    const selfPayAmount = totalAmount;
    
    return { totalAmount, selfPayAmount: selfPayAmount || totalAmount, insuranceAmount: '0.00', items };
  } else {
    // 原有逻辑：单行格式
    lines.forEach((line, idx) => {
      if (!totalAmount && /价税合计.*大写/.test(line)) {
        const nextLine = lines[idx + 1];
        if (nextLine && /[（(]小写[)）]/.test(nextLine)) {
          const amt = extractAmt(nextLine);
          if (amt) totalAmount = amt;
        }
      }
      if (!totalAmount && /[（(]小写[)）].*￥/.test(line)) {
        const amt = extractAmt(line);
        if (amt) totalAmount = amt;
      }

      // 【修复】排除中文大写金额（如"壹仟贰佰捌拾肆圆整"）被误识别为项目名称
      const isChineseAmount = /^[零一二三四五六七八九十百千万亿圆整]+$/.test(line);
      if (isChineseAmount) return;

      const hasTaxCode = /^\*[^*]+\*/.test(line);
      if (hasTaxCode && !TAX_EXCLUDE.test(line)) {
        let itemName = cleanItemName(line.split(/\s+/)[0] || line);
        const nextIdx = idx + 1;
        if (nextIdx < lines.length) {
          const nextLine = lines[nextIdx].trim();
          if (/^[\u4e00-\u9fa5]/.test(nextLine) && !/^\*[^*]+\*/.test(nextLine) &&
              !/^\d/.test(nextLine) && !/^(数量|单价|金额|税率|税额|合计|支|瓶|盒|袋|粒|片)$/.test(nextLine)) {
            itemName += nextLine;
          }
        }
        const SKIP_KEYWORDS = /^(数量|单价|金额税率|征收率|税额|支|瓶|盒|袋|粒|片)$/;
        for (let i = idx + 1; i <= idx + 5 && i < lines.length; i++) {
          const nextLine = lines[i].trim();
          if (/^\*[^*]+\*/.test(nextLine) || /合计|税额/.test(nextLine)) break;
          if (SKIP_KEYWORDS.test(nextLine) || /%/.test(nextLine)) continue;
          if (/^\d{8,}$/.test(nextLine.replace(/\./g, ''))) continue;
          const amt = extractAmt(nextLine);
          if (amt && parseFloat(amt) > 0) { items.push({ name: itemName, amount: amt }); break; }
        }
      }
    });
  }

  return { totalAmount, selfPayAmount: totalAmount, insuranceAmount: '0.00', items };
};

const extractInvoiceAmounts = (ocrText) => {
  if (!ocrText) return { totalAmount: '', selfPayAmount: '', insuranceAmount: '', items: [] };

  // Normalize OCR artifacts: remove extra spaces in numbers
  // "2, 826. 00" → "2,826.00", "960. 00" → "960.00"
  ocrText = ocrText.replace(/(\d),\s+(\d)/g, '$1,$2');
  ocrText = ocrText.replace(/(\d)\.\s+(\d)/g, '$1.$2');

  // 检测是否为电子发票（增值税发票）
  const isElectronicInvoice = /电子发票|普用发票|专用发票|增值税发票|国家税务总局|税率|税额|价税合计/.test(ocrText);
  if (isElectronicInvoice) {
    console.log('[OCR] 检测到电子发票格式');
    return extractElectronicInvoice(ocrText);
  }

  // 截取备注之前的内容（备注后为支付明细，不提取项目）
  const cutoff1 = ocrText.search(/^备注[：:]/m);
  const cutoff2 = ocrText.search(/收款单位/);
  const firstPageCutoff = cutoff1 > 0 ? cutoff1 : (cutoff2 > 0 ? cutoff2 : -1);
  const firstPageText = firstPageCutoff > 0 ? ocrText.slice(0, firstPageCutoff) : ocrText;
  const lines = firstPageText.split('\n').map(l => l.trim()).filter(Boolean);

  let totalAmount = '';
  let insuranceAmount = '';
  let selfPayCandidates = [];
  const items = [];

  const cleanAmount = (str) => parseFloat(str.replace(/[¥￥,，\s]/g, '')).toFixed(2);
  const extractAmt = (text) => {
    const m = text.match(/[：:]\s*([¥￥]?[\d,，]+\.?\d*)\s*$/);
    if (m) { const v = cleanAmount(m[1]); if (!isNaN(v) && parseFloat(v) >= 0) return v; }
    const m2 = text.match(/([¥￥]?[\d,，]+\.\d{2})\s*$/);
    if (m2) { const v = cleanAmount(m2[1]); if (!isNaN(v) && parseFloat(v) > 0) return v; }
    return null;
  };
  const isAmountOnlyLine = (line) => /^[¥￥]?[\d,，]+\.?\d*$/.test(line);
  const findAmountAfter = (idx) => {
    for (let i = idx + 1; i <= idx + 5 && i < lines.length; i++) {
      if (isAmountOnlyLine(lines[i])) {
        const v = cleanAmount(lines[i]);
        if (!isNaN(v) && parseFloat(v) > 0) return v;
      }
      const m = lines[i].match(/([¥￥]?[\d,，]+\.\d{2})/);
      if (m) { const v = cleanAmount(m[1]); if (!isNaN(v) && parseFloat(v) > 0) return v; }
    }
    return null;
  };

  const EXCLUDE_PATTERN = /余额|账户余额|个人医保账户余额|个人账户余额/;

  lines.forEach((line, idx) => {
    if (EXCLUDE_PATTERN.test(line)) return;

    // 合计金额
    if (!totalAmount && /^合计$|^总计$/.test(line)) {
      const after = findAmountAfter(idx);
      if (after) totalAmount = after;
    } else if (!totalAmount && /合计|总计/.test(line) && !/小计|分计/.test(line)) {
      const amt = extractAmt(line);
      if (amt && parseFloat(amt) > 0) totalAmount = amt;
      else { const after = findAmountAfter(idx); if (after) totalAmount = after; }
    }

    // 个人自付（收集所有候选，取最大值）
    const isSelfPayCandidate = /个人自付|个人自费|个人现金支付/.test(line) && !/个人账户/.test(line);
    if (isSelfPayCandidate) {
      const amt = extractAmt(line) ?? findAmountAfter(idx);
      if (amt !== null) { const v = parseFloat(amt); if (v > 0) selfPayCandidates.push(v); }
    }

    // 医保统筹基金支付
    // 【修复】明确提取到金额（包括0.00）时直接记录，不再向后找（避免误识别后续行的合计金额）
    if (!insuranceAmount && /医保统筹基金支付|统筹基金支付|医保支付金额/.test(line)) {
      const amt = extractAmt(line);
      if (amt !== null) {
        insuranceAmount = amt; // 0.00 也直接记录，表示明确为0
      } else {
        const after = findAmountAfter(idx);
        if (after) insuranceAmount = after;
      }
    }

    // 项目明细
    const ITEM_EXCLUDE = /合计|总计|小计|日期|时间|编号|发票|收款|章|支付|余额|保险|备注|单位|数量|自费|自付|项目名称|大写|小写/;
    const KNOWN_CATEGORIES = /^(床位费|诊察费|检查费|化验费|治疗费|手术费|护理费|西药费|中药费|中成药|其他住院费|材料费|输血费|氧气费|放射费|放疗费|理疗费|超声费|药费|挂号费|急诊费)$/;
    const MEDICAL_SUFFIX = /费|药|器|材|疗|护|查|验|射|氧|血|诊|号|急$/;

    // Match: "项目名 [数量] 金额" — capture last amount on the line (skip quantity digits)
    const singleLineMatch = line.match(/^([\u4e00-\u9fa5][^\d\n]{1,20}?)\s+(?:\d{1,3}\s+)?[¥￥]?\s*([\d,，]+\.\d{2})\s*(?:[\d.;:\s]*)?$/);
    if (singleLineMatch) {
      const itemName = singleLineMatch[1].trim();
      if (!ITEM_EXCLUDE.test(itemName)) {
        const amount = parseFloat(singleLineMatch[2].replace(/[,，]/g, '')).toFixed(2);
        if (parseFloat(amount) > 0) items.push({ name: itemName.replace(/[：:]\s*$/, ''), amount });
      }
    }

    const isKnownCategory = KNOWN_CATEGORIES.test(line);
    const isPureChinese = /^[\u4e00-\u9fa5]{2,8}费$/.test(line) ||
                          (/^[\u4e00-\u9fa5]{2,6}$/.test(line) && MEDICAL_SUFFIX.test(line));
    if ((isKnownCategory || isPureChinese) && !ITEM_EXCLUDE.test(line)) {
      let foundAmt = null;
      let accumulated = '';
      for (let k = idx + 1; k <= idx + 4 && k < lines.length; k++) {
        const nextLine = lines[k].trim();
        if (KNOWN_CATEGORIES.test(nextLine)) break;
        if (/\d+\.\d+\//.test(nextLine)) continue;
        // Skip quantity-only lines (e.g. "1", "10", "2次") to prevent "1" + "19.00" → "119.00"
        if (/^\d{1,3}[次天支瓶盒袋粒片个只根包套件张条管]?$/.test(nextLine)) continue;
        accumulated += nextLine;
        const amtMatch = accumulated.match(/([\d,，\s]+\.\d{2})/);
        if (amtMatch) {
          const v = parseFloat(amtMatch[1].replace(/[,，\s]/g, ''));
          if (v > 0) { foundAmt = v.toFixed(2); break; }
        }
      }
      if (foundAmt && !items.find(it => it.name === line)) items.push({ name: line, amount: foundAmt });
    }
  });

  // 全文兜底补提取（备注后也可能有金额）
  if (!selfPayCandidates.length || !insuranceAmount || !totalAmount) {
    const fullLines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
    fullLines.forEach((line, idx) => {
      if (/余额|账户余额/.test(line)) return;
      // 兜底：合计金额
      if (!totalAmount && /合计|总计/.test(line) && !/小计|分计/.test(line)) {
        const amt = extractAmt(line) ?? findAmountAfterFull(idx, fullLines);
        if (amt && parseFloat(amt) > 0) totalAmount = amt;
      }
      // 兜底：自付金额（继续收集候选）
      if (/个人自付|个人自费|个人现金支付/.test(line) && !/个人账户/.test(line)) {
        const amt = extractAmt(line) ?? findAmountAfterFull(idx, fullLines);
        if (amt && parseFloat(amt) > 0) selfPayCandidates.push(parseFloat(amt));
      }
      // 兜底：医保金额
      if (!insuranceAmount && /医保统筹基金支付|统筹基金支付/.test(line)) {
        const amt = extractAmt(line) ?? findAmountAfterFull(idx, fullLines);
        if (amt && parseFloat(amt) > 0) insuranceAmount = amt;
      }
    });
  }

  // 【修复】添加全文用的findAmountAfter函数
  function findAmountAfterFull(idx, fullLines) {
    for (let i = idx + 1; i <= idx + 5 && i < fullLines.length; i++) {
      if (isAmountOnlyLine(fullLines[i])) {
        const v = cleanAmount(fullLines[i]);
        if (!isNaN(v) && parseFloat(v) > 0) return v;
      }
      const m = fullLines[i].match(/([¥￥]?[\d,，]+\.\d{2})/);
      if (m) { const v = cleanAmount(m[1]); if (!isNaN(v) && parseFloat(v) > 0) return v; }
    }
    return null;
  }

  // 计算最终自付金额（取最大非零值）
  const finalSelfPay = selfPayCandidates.length > 0 ? Math.max(...selfPayCandidates).toFixed(2) : '';
  console.log('[extractInvoiceAmounts] Result:', { totalAmount, finalSelfPay, insuranceAmount, items: items.length });
  return { totalAmount, selfPayAmount: finalSelfPay, insuranceAmount, items };
};

const extractInvoiceDate = (text, dates, filename) => {
  if (text) {
    // 优先识别"开票日期"、"发票日期"、"日期"关键词后的日期
    const lines = text.split('\n');
    for (const line of lines) {
      if (/开票日期|发票日期|日期/.test(line)) {
        const m = line.match(/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/);
        if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
      }
    }
    // 兜底：全文首个日期
    const m = text.match(/(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  }
  if (dates?.length) return dates[0];
  const fm = filename?.match(/(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  return fm ? `${fm[1]}-${fm[2]}-${fm[3]}` : new Date().toISOString().split('T')[0];
};

const extractInvoiceNumber = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  for (const line of lines) {
    // 医疗收费票据：门诊号/住院号/票据号码/收据号码
    const medicalMatch = line.match(/(?:门诊号|住院号|票据号码|收据号码)[：:]\s*(\d+)/);
    if (medicalMatch) return medicalMatch[1];
    // 电子发票：20位发票号码
    const electronicMatch = line.match(/发票号码[：:]\s*(\d{20})/);
    if (electronicMatch) return electronicMatch[1];
    // 通用：10-20位
    const genericMatch = line.match(/(?:发票号码|票号|编号)[：:]\s*(\d{10,20})/);
    if (genericMatch) return genericMatch[1];
  }
  return null;
};

// ===== 删除/解析 =====
// 底层删除（不含确认弹窗），供单张和批量共用
const _doDeleteInvoice = async (invoiceId) => {
  const inv = invoiceStore.invoices.find(i => i.id === invoiceId);
  if (inv?.backendId) {
    try { await apiRequest(`/invoices/${inv.backendId}`, { method: 'DELETE' }); } catch (_) {}
  }
  invoiceStore.deleteInvoice(invoiceId);
};

// 单张删除（含确认弹窗）
const deleteInvoice = async (invoiceId) => {
  try {
    await ElMessageBox.confirm('确定要删除该发票吗？此操作不可恢复！', '确认删除', { type: 'warning' });
    await _doDeleteInvoice(invoiceId);
    ElMessage.success('发票已删除');
  } catch (_) {}
};

const reparseInvoice = async (invoice) => {
  if (!invoice.ocrRawText) { ElMessage.warning('无OCR原文，无法重新解析'); return; }
  console.log('=== 重新解析发票 ===', invoice.fileName);
  const { totalAmount, selfPayAmount, insuranceAmount, items } = extractInvoiceAmounts(invoice.ocrRawText);
  const newItems = Array.isArray(items) && items.length > 0 ? items : (Array.isArray(invoice.items) ? invoice.items : []);
  const finalTotal = totalAmount ? parseFloat(totalAmount).toFixed(2) : (invoice.totalAmount || '0.00');
  const finalSelfPay = selfPayAmount || invoice.selfPayAmount || '';
  const finalInsurance = insuranceAmount || invoice.insuranceAmount || '';
  // 重新提取发票号码并更新 title
  const invoiceNumber = extractInvoiceNumber(invoice.ocrRawText);
  const newTitle = invoiceNumber ? `发票-${invoiceNumber}` : invoice.title;
  const updated = { ...invoice, totalAmount: finalTotal, selfPayAmount: finalSelfPay, insuranceAmount: finalInsurance, items: newItems, title: newTitle };
  invoiceStore.updateInvoice(updated);
  const msg = invoiceNumber
    ? `重新解析完成！识别到 ${newItems.length} 个费用项目，名称已更新为 ${newTitle}`
    : `重新解析完成！识别到 ${newItems.length} 个费用项目`;
  ElMessage.success(msg);
};

const batchReparse = async () => {
  const list = filteredInvoices.value.filter(i => i.ocrRawText);
  if (list.length === 0) { ElMessage.warning('当前范围内没有可解析的发票'); return; }
  try {
    await ElMessageBox.confirm(`确定重新解析 ${list.length} 张发票？`, '批量解析', { type: 'warning' });
    let count = 0;
    // 用 for...of 串行等待每个 async reparseInvoice 完成
    for (const inv of list) {
      try { await reparseInvoice(inv); count++; } catch (e) { console.error(`批量解析失败 [${inv.id}]:`, e); }
    }
    ElMessage.success(`已完成 ${count}/${list.length} 张发票解析`);
  } catch (_) {}
};

const batchDelete = async () => {
  const list = filteredInvoices.value;
  if (list.length === 0) { ElMessage.warning('当前范围内没有可删除的发票'); return; }
  try {
    await ElMessageBox.confirm(`⚠️ 确定删除 ${list.length} 张发票？此操作不可恢复！`, '批量删除', { type: 'warning' });
    // 快照ID列表，避免删除过程中 filteredInvoices 变化
    const ids = list.map(inv => inv.id);
    for (const id of ids) {
      try { await _doDeleteInvoice(id); } catch (e) { console.error(`批量删除失败 [${id}]:`, e); }
    }
    ElMessage.success(`已删除 ${ids.length} 张发票`);
  } catch (_) {}
};

// ===== 预览/下载 =====
const previewInvoice = (invoice) => {
  if (!invoice.fileUrl) { ElMessage.warning('该发票无文件链接'); return; }
  previewUrl.value = invoice.fileUrl;
  previewIsPdf.value = invoice.fileType === 'application/pdf' || invoice.fileName?.toLowerCase().endsWith('.pdf');
  previewVisible.value = true;
};

const downloadInvoice = async (invoice) => {
  if (!invoice.fileUrl) { ElMessage.warning('该发票无文件链接'); return; }
  try {
    ElMessage.info('正在下载...');
    const res = await fetch(invoice.fileUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = invoice.fileName || `发票_${invoice.date}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error('[Invoice] Download failed:', e);
    ElMessage.error('下载失败，请重试');
  }
};

const downloadAllLoading = ref(false);

const downloadAll = async () => {
  const list = filteredInvoices.value.filter(i => i.fileUrl);
  if (list.length === 0) { ElMessage.warning('没有可下载的发票'); return; }
  if (list.length === 1) { downloadInvoice(list[0]); return; }

  downloadAllLoading.value = true;
  ElMessage.info(`正在生成ZIP，共 ${list.length} 张发票，请稍候...`);

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
    const folderName = sanitize(patient ? `${patient.name}发票` : '发票');
    const fileNameCounters = {};
    let successCount = 0;

    for (const inv of list) {
      try {
        let fileData, isBase64 = false;
        const ext = inv.fileName?.split('.').pop()?.toLowerCase() || 'jpg';

        if (inv.fileUrl.startsWith('data:')) {
          // base64 格式直接取
          fileData = inv.fileUrl.split(',')[1];
          isBase64 = true;
        } else {
          // OSS 链接：fetch 获取 blob（已配置 CORS）
          const res = await fetch(inv.fileUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          fileData = await res.arrayBuffer();
        }

        let fileName = sanitize(`${inv.date}_${inv.title || inv.fileName || '发票'}.${ext}`);
        // 文件名去重
        if (fileNameCounters[fileName]) {
          fileNameCounters[fileName]++;
          fileName = sanitize(`${inv.date}_${inv.title || '发票'}_${fileNameCounters[fileName]}.${ext}`);
        } else { fileNameCounters[fileName] = 1; }

        zip.file(`${folderName}/${fileName}`, fileData, { base64: isBase64 });
        successCount++;
      } catch (e) {
        console.error(`[Invoice] ZIP add failed [${inv.id}]:`, e);
      }
    }

    if (successCount === 0) { ElMessage.warning('所有发票文件获取失败，ZIP为空'); return; }

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const today = new Date();
    const zipName = `${sanitize(patient?.name || '')}发票导出_${today.getFullYear()}${today.getMonth()+1}${today.getDate()}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = zipName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ElMessage.success(`导出成功: ${zipName}（${successCount}/${list.length} 张）`);
  } catch (e) {
    console.error('[Invoice] Export ZIP failed:', e);
    ElMessage.error('导出失败: ' + e.message);
  } finally {
    downloadAllLoading.value = false;
  }
};

// 【新增】查找关联病历（优先同日，其次7天内最近）
const findLinkedRecord = (patientId, invoiceDate) => {
  if (!patientId || !invoiceDate) return null;
  const records = recordsStore.getPatientRecords(patientId);
  if (records.length === 0) return null;
  // 同日期病历优先
  const sameDay = records.find(r => r.date === invoiceDate);
  if (sameDay) return sameDay;
  // 7天内最近病历
  const invoiceTime = new Date(invoiceDate).getTime();
  const nearby = records.find(r => {
    const diff = Math.abs(new Date(r.date).getTime() - invoiceTime);
    return diff <= 7 * 24 * 60 * 60 * 1000;
  });
  return nearby || null;
};

// Linked record preview — open in-place without routing
const linkedRecordVisible = ref(false);
const linkedRecordFiles = ref([]);
const linkedRecordPatient = ref(null);
const linkedRecordRecord = ref(null);

const jumpToLinkedRecord = (patientId, invoiceDate) => {
  const record = findLinkedRecord(patientId, invoiceDate);
  if (!record) { ElMessage.warning('未找到关联病历'); return; }
  const patient = patientsStore.getPatientById(patientId);
  const files = record.files || [];
  if (files.length === 0) { ElMessage.warning('该病历暂无文件'); return; }
  linkedRecordFiles.value = files;
  linkedRecordPatient.value = patient;
  linkedRecordRecord.value = record;
  linkedRecordVisible.value = true;
};
</script>

<style scoped>
.invoice-layout {
  display: flex;
  gap: 0.5rem;
  height: calc(100vh - 56px);
  overflow: hidden;
  padding: 0.75rem 1rem 0.5rem;
  background: #f5f5f5;
}
.patient-sidebar {
  width: 140px;
  flex-shrink: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 0.75rem;
  overflow-y: auto;
}
.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}
.invoice-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
}
.toolbar-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 0.6rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex-shrink: 0;
}
.summary-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 0.6rem 1rem;
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.summary-item { display: flex; align-items: center; gap: 8px; }
.summary-label { font-size: 11px; color: #888; }
.summary-value { font-size: 18px; font-weight: 700; color: #333; }
.anomaly-badge { background: #fff0f0; padding: 6px 14px; border-radius: 8px; border: 1px solid #ffcdd2; }
.invoice-list { flex: 1; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow-y: auto; padding: 0.75rem; }
.invoice-card {
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.invoice-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.invoice-header {
  background: #fafafa;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid #eee;
}
.invoice-empty {
  flex: 1;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #888;
  gap: 1rem;
  font-size: 1.1rem;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .invoice-layout {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 56px);
    padding: 0.5rem;
    gap: 0.4rem;
  }
  .patient-sidebar {
    width: auto;
    display: flex;
    flex-direction: row;
    gap: 6px;
    padding: 0.5rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .patient-sidebar::-webkit-scrollbar { display: none; }
  .sidebar-title { display: none; } /* 小屏幕隐藏标题 */
  .invoice-main { min-height: 400px; }
  .toolbar-card {
    flex-direction: column;
    align-items: stretch;
    padding: 0.5rem;
    gap: 0.6rem;
  }
  .toolbar-card > div:last-child {
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  .summary-card { padding: 0.5rem; gap: 1rem; }
  .summary-value { font-size: 16px; }
  .invoice-header { padding: 10px 12px; }
}

@media (max-width: 480px) {
  .summary-card { gap: 0.6rem; }
  .summary-item { gap: 4px; }
  .summary-label { font-size: 10px; }
  .summary-value { font-size: 14px; }
  .invoice-header { flex-direction: column; align-items: flex-start; gap: 6px; }
}

/* ===== Step1: 患者侧边栏Tab横向滚动（已有，补强） ===== */
@media (max-width: 768px) {
  .patient-sidebar { flex-wrap: nowrap !important; }
}

/* ===== Step2: 工具栏日期输入小屏换行 ===== */
@media (max-width: 480px) {
  .toolbar-card > div:first-child {
    flex-direction: column !important;
    align-items: stretch !important;
  }
  .toolbar-card input[type="date"] {
    width: 100%;
    flex: 1;
  }
  .toolbar-card > div:last-child {
    flex-wrap: wrap !important;
    gap: 6px !important;
  }
  .toolbar-card > div:last-child .el-button {
    flex: 1;
    min-width: 0;
  }
}
</style>

<template>
  <div class="dashboard">
    <div class="content-card">
      <h2 style="margin:0 0 1rem; display:flex; align-items:center; gap:8px;"><AppIcon name="invoice" :size="22" style="color:#d03050;" /> 发票统计管理</h2>

      <!-- 患者 pill 按钮 -->
      <PatientTabBar
      :patients="patientsStore.patients"
      :active-patient-id="activePatientId"
      :get-count="(id) => invoiceStore.getPatientInvoices(id).length"
      module-key="invoice"
      accent-color="#d03050"
      @select="switchPatient"
    />

    <!-- 右侧内容区 -->
    <div v-if="activePatientId" class="invoice-main">
      <!-- 顶部工具栏 -->
      <div class="toolbar-card">
        <!-- 左侧时间筛选 -->
        <div class="toolbar-filters">
          <div class="range-quick-btns">
            <button v-for="m in [1,3,6,12]" :key="m" type="button" @click="setDateRange(m)" :style="invoiceRangeBtn(m)">
              近{{ m === 12 ? '1年' : m + '个月' }}
            </button>
          </div>
          <DateRangePicker
            v-model:start="filterDateStart"
            v-model:end="filterDateEnd"
            accent-color="#d03050"
            @change="onCustomDateRangeChange"
            @clear="clearFilter"
          />
          <YearPicker
            :model-value="filterYear"
            accent-color="#d03050"
            placeholder="按年筛选"
            @update:model-value="setFilterYear"
          />
        </div>
        <!-- 右侧操作按钮 -->
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <el-button type="danger" @click="triggerUpload">📤 上传发票</el-button>
          <el-button v-if="filteredInvoices.length > 0" type="primary" @click="downloadAll" :loading="downloadAllLoading">📥 全部下载</el-button>
          <el-button v-if="filteredInvoices.length > 0" type="warning" @click="batchReparse">🔄 批量解析</el-button>
          <el-button v-if="filteredInvoices.length > 0" type="danger" @click="batchDelete">🗑️ 批量删除</el-button>
        </div>
      </div>

      <InvoiceSummaryBar
        v-if="filteredInvoices.length > 0"
        :total-amount="totalAmount"
        :self-pay-amount="selfPayAmount"
        :commercial-amount="commercialTotal"
        :actual-self-pay-amount="actualSelfPayAmount"
        :invoice-count="filteredInvoices.length"
        :duplicate-count="duplicateCount"
        :anomaly-count="anomalyCount"
      />

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
              <el-popover v-if="Array.isArray(inv.items) && getInvoiceAnomalies(inv).length > 0" placement="top" :width="280" trigger="hover">
                <template #reference>
                  <span style="color:#d03050; font-size:16px; font-weight:700; cursor:pointer;">❗</span>
                </template>
                <div>
                  <div v-for="(a, idx) in getInvoiceAnomalies(inv)" :key="idx"
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
              <!-- 商保报销：标签 + 勾选 + 金额 + 保存 -->
              <span class="commercial-label" title="商保报销状态标签（不可点击）">已由商保报销</span>
              <el-checkbox
                :model-value="getCommercialDraft(inv).checked"
                @change="(val) => onCommercialCheckChange(inv, val)"
              />
              <el-input
                :model-value="getCommercialDraft(inv).amount"
                :disabled="!getCommercialDraft(inv).checked"
                type="number"
                size="small"
                placeholder="金额"
                class="commercial-amount-input"
                @update:model-value="(val) => onCommercialAmountChange(inv, val)"
              />
              <el-button size="small" type="success" @click="saveCommercialReimbursement(inv)">保存</el-button>
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
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { usePatientsStore } from '@/stores/usePatients';
import { useInvoiceStore } from '@/stores/useInvoice';
import { useRecordsStore } from '@/stores/useRecords';
import { uploadFileToCloud } from '@/api/files';
import { processOcrFile } from '@/api/ocr';
import { createInvoice, deleteInvoice as deleteInvoiceApi } from '@/api/invoices';
import {
  extractInvoiceAmounts,
  extractInvoiceDate,
  extractInvoiceNumber
} from '@/utils/invoice-parser';
import { useDateRangeFilter } from '@/composables/useDateRangeFilter';
import { useRoutePatientId } from '@/composables/useRoutePatientId';
import { useInvoiceDuplicates } from '@/composables/invoice/useInvoiceDuplicates';
import { getInvoiceAnomalies, useInvoiceAnomalyCount } from '@/composables/invoice/useInvoiceAnomalies';
import AppIcon from '@/components/AppIcon.vue';
import PatientTabBar from '@/components/common/PatientTabBar.vue';
import InvoiceSummaryBar from '@/components/invoice/InvoiceSummaryBar.vue';
import DateRangePicker from '@/components/common/DateRangePicker.vue';
import YearPicker from '@/components/common/YearPicker.vue';
import { usePatientScope } from '@/stores/usePatientScope';
import FilePreviewDialog from '@/components/FilePreviewDialog.vue';

const router = useRouter();
const patientsStore = usePatientsStore();
const invoiceStore = useInvoiceStore();
const recordsStore = useRecordsStore();
const patientScope = usePatientScope();

const { activePatientId } = useRoutePatientId(() => patientsStore.patients);

const {
  filterDateStart,
  filterDateEnd,
  filterYear,
  filteredList: filteredInvoices,
  setDateRange,
  setFilterYear,
  onCustomDateRangeChange,
  clearFilter,
  rangeBtnStyle: rangeBtn
} = useDateRangeFilter(() =>
  activePatientId.value ? invoiceStore.getPatientInvoices(activePatientId.value) : []
);

const { duplicateMap, duplicateCount } = useInvoiceDuplicates(filteredInvoices);
const { anomalyCount } = useInvoiceAnomalyCount(filteredInvoices);
const previewVisible = ref(false);
const previewUrl = ref('');
const previewIsPdf = ref(false);

/** Draft edits for commercial reimbursement before clicking Save */
const commercialDrafts = reactive({});

function getCommercialDraft(inv) {
  const key = String(inv.id);
  if (!commercialDrafts[key]) {
    commercialDrafts[key] = {
      checked: !!inv.commercialReimbursed,
      amount: inv.commercialReimbursed && inv.commercialAmount != null && inv.commercialAmount !== ''
        ? String(inv.commercialAmount)
        : ''
    };
  }
  return commercialDrafts[key];
}

function onCommercialCheckChange(inv, checked) {
  const draft = getCommercialDraft(inv);
  draft.checked = !!checked;
  if (!draft.checked) draft.amount = '';
}

function onCommercialAmountChange(inv, value) {
  getCommercialDraft(inv).amount = value == null ? '' : String(value);
}

function getInvoiceSelfPayCap(inv) {
  const selfPay = parseFloat(inv.selfPayAmount);
  if (!Number.isNaN(selfPay) && selfPay > 0) return selfPay;
  const total = parseFloat(inv.totalAmount);
  if (!Number.isNaN(total) && total > 0) return total;
  return 0;
}

function saveCommercialReimbursement(inv) {
  const draft = getCommercialDraft(inv);
  if (!draft.checked) {
    invoiceStore.updateInvoice({
      ...inv,
      commercialReimbursed: false,
      commercialAmount: '0.00'
    });
    draft.amount = '';
    ElMessage.success('已取消商保报销并保存');
    return;
  }
  const amount = parseFloat(draft.amount);
  if (Number.isNaN(amount) || amount < 0) {
    ElMessage.warning('请输入有效的商保报销金额（≥0）');
    return;
  }
  const cap = getInvoiceSelfPayCap(inv);
  if (cap > 0 && amount > cap) {
    ElMessage.warning(`商保报销金额不能超过该票自付上限 ¥${cap.toFixed(2)}`);
    return;
  }
  if (cap === 0 && amount > 0) {
    ElMessage.warning('该发票无自付/总金额，无法填写商保报销');
    return;
  }
  const amountText = amount.toFixed(2);
  invoiceStore.updateInvoice({
    ...inv,
    commercialReimbursed: true,
    commercialAmount: amountText
  });
  draft.amount = amountText;
  ElMessage.success('商保报销已保存');
}

const totalAmount = computed(() =>
  filteredInvoices.value.reduce((s, i) => s + parseFloat(i.totalAmount || 0), 0).toFixed(2)
);
const selfPayAmount = computed(() =>
  filteredInvoices.value.reduce((s, i) => s + parseFloat(i.selfPayAmount || 0), 0).toFixed(2)
);
const commercialTotal = computed(() =>
  filteredInvoices.value
    .filter(i => i.commercialReimbursed)
    .reduce((s, i) => s + parseFloat(i.commercialAmount || 0), 0)
    .toFixed(2)
);
const actualSelfPayAmount = computed(() => {
  const actual = parseFloat(selfPayAmount.value) - parseFloat(commercialTotal.value);
  return Math.max(0, actual).toFixed(2);
});

const switchPatient = (id) => { activePatientId.value = id; patientScope.setCurrentPatient(id); };

const invoiceRangeBtn = (m) => rangeBtn(m, '#d03050');

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
        const ocrResult = await processOcrFile(file);
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
          commercialReimbursed: false,
          commercialAmount: '0.00',
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
            commercialReimbursed: 0,
            commercialAmount: 0,
            items: JSON.stringify(newInvoice.items), // 后端 items 是 JSON 字符串
            ocrRawText: newInvoice.ocrRawText,
            uploadTime: new Date(newInvoice.uploadTime).toISOString()
          };
          console.log('[Invoice Upload] Step 8: Backend payload:', backendInvoice);
          const res = await createInvoice(backendInvoice);
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

// ===== 删除/解析 =====
// 底层删除（不含确认弹窗），供单张和批量共用
const _doDeleteInvoice = async (invoiceId) => {
  const inv = invoiceStore.invoices.find(i => i.id === invoiceId);
  if (inv?.backendId) {
    try { await deleteInvoiceApi(inv.backendId); } catch (_) {}
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
.invoice-main {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.toolbar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.25rem 0 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}
.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.range-quick-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.range-quick-btns button {
  padding: 5px 12px;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.summary-item { display: flex; align-items: center; gap: 8px; }
.summary-label { font-size: 11px; color: #888; }
.summary-value { font-size: 18px; font-weight: 700; color: #333; }
.anomaly-badge { background: #fff0f0; padding: 6px 14px; border-radius: 8px; border: 1px solid #ffcdd2; }
.invoice-list { display: flex; flex-direction: column; padding: 0.25rem 0; }
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
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #888;
  gap: 1rem;
  font-size: 1.1rem;
  padding: 3rem 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
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

/* ===== 工具栏小屏换行 ===== */
@media (max-width: 480px) {
  .toolbar-filters {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
  .range-quick-btns {
    justify-content: flex-start;
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

.commercial-label {
  font-size: 11px;
  background: #e8f5e9;
  color: #2e7d32;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid #c8e6c9;
  user-select: none;
  cursor: default;
  pointer-events: none;
}
.commercial-amount-input {
  width: 100px;
}
</style>

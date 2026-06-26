<template>
  <div class="patients-page">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <div>
        <h2 style="margin:0; font-size:1.3rem; color:#333;">👥 患者档案管理</h2>
        <div style="font-size:13px; color:#888; margin-top:2px;">共 {{ patientsStore.patients.length }} 位患者</div>
      </div>
      <el-button type="primary" @click="showAddModal = true">+ 新增患者</el-button>
    </div>

    <!-- 患者卡片网格 -->
    <div class="patient-grid">
      <div v-for="(patient, idx) in patientsStore.patients" :key="patient.id"
        class="patient-card" @click="viewDetail(patient)"
        :style="{ animationDelay: idx * 50 + 'ms' }">

        <!-- 修改头像按钮 -->
        <button class="avatar-edit-btn" @click.stop="triggerAvatarUpload(patient)">修改头像</button>

        <!-- 头像 + 基本信息 -->
        <div style="display:flex; align-items:center; margin-bottom:0.85rem;">
          <div class="avatar-circle" @click.stop="openAvatarEditor(patient)" style="cursor:pointer;" title="点击修改头像">
            <img v-if="patient.avatar" :src="patient.avatar" :alt="patient.name" style="width:100%; height:100%; object-fit:contain; background:#f5f5f5;" />
            <AppIcon v-else name="avatar" :size="34" style="color:#bbb;" />
          </div>
          <div style="flex:1; min-width:0;">
            <div class="patient-name">{{ patient.name }}</div>
            <div class="patient-meta">
              <span class="gender-tag" :class="patient.gender === 1 ? 'gender-male' : 'gender-female'">{{ patient.gender === 1 ? '男' : '女' }}</span>
              <span>{{ getAge(patient.birthDate) }} 岁</span>
              <span style="color:#ccc;">·</span>
              <span>{{ patient.patientNo }}</span>
            </div>
          </div>
        </div>

        <!-- 联系方式 -->
        <div class="patient-contact">
          <span>📱 {{ maskPhone(patient.phone) }}</span>
        </div>

        <!-- 数据统计标签 -->
        <div class="patient-stats">
          <div class="stat-pill stat-pill-blue">
            <span class="stat-num">{{ getCount('records', patient.id) }}</span>
            <span class="stat-lbl">病历</span>
          </div>
          <div class="stat-pill stat-pill-purple">
            <span class="stat-num">{{ getCount('lab', patient.id) }}</span>
            <span class="stat-lbl">检验</span>
          </div>
          <div class="stat-pill stat-pill-teal">
            <span class="stat-num">{{ getCount('imaging', patient.id) }}</span>
            <span class="stat-lbl">影像</span>
          </div>
          <div class="stat-pill stat-pill-orange">
            <span class="stat-num">{{ getCount('invoice', patient.id) }}</span>
            <span class="stat-lbl">发票</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="patient-actions" @click.stop>
          <el-button size="small" type="primary" @click.stop="viewDetail(patient)">查看详情</el-button>
          <el-button size="small" @click.stop="editPatient(patient)">编辑</el-button>
          <el-button size="small" type="danger" @click.stop="confirmDelete(patient)">删除</el-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="patientsStore.patients.length === 0" class="empty-state">
        <div style="margin-bottom:1rem; color:#ccc;"><AppIcon name="patients" :size="56" /></div>
        <p style="font-size:1.1rem; color:#666; margin-bottom:1rem;">暂无患者记录</p>
        <el-button type="primary" @click="showAddModal = true">添加第一个患者</el-button>
      </div>
    </div>

    <!-- 新增/编辑患者弹窗 -->
    <el-dialog v-model="showAddModal" :title="editingPatient ? '编辑患者' : '新增患者'" width="600px">
      <el-form :model="patientForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="patientForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="patientForm.gender">
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="出生日期" prop="birthDate">
          <el-date-picker v-model="patientForm.birthDate" type="date" value-format="YYYY-MM-DD" placeholder="选择出生日期" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="patientForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="身份证号">
          <el-input v-model="patientForm.idCard" placeholder="请输入身份证号" />
        </el-form-item>
        <el-form-item label="住址">
          <el-input v-model="patientForm.address" placeholder="请输入住址" />
        </el-form-item>
        <el-form-item label="紧急联系人">
          <el-input v-model="patientForm.emergencyContact" placeholder="紧急联系人姓名" />
        </el-form-item>
        <el-form-item label="紧急电话">
          <el-input v-model="patientForm.emergencyPhone" placeholder="紧急联系人电话" />
        </el-form-item>
        <el-form-item label="过敏史">
          <el-input v-model="patientForm.allergyHistory" type="textarea" :rows="2" placeholder="如无填写无" />
        </el-form-item>
        <el-form-item label="既往病史">
          <el-input v-model="patientForm.medicalHistory" type="textarea" :rows="2" placeholder="如无填写无" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeModal">取消</el-button>
        <el-button type="primary" @click="savePatient" :loading="saving">
          {{ editingPatient ? '更新' : '保存' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { usePatientsStore } from '@/stores/usePatients';
import { uploadFileToCloud } from '@/api/index';
import AppIcon from '@/components/AppIcon.vue';
import { useLabStore } from '@/stores/useLab';
import { useImagingStore } from '@/stores/useImaging';
import { useInvoiceStore } from '@/stores/useInvoice';
import { useRecordsStore } from '@/stores/useRecords';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const patientsStore = usePatientsStore();
const labStore = useLabStore();
const imagingStore = useImagingStore();
const invoiceStore = useInvoiceStore();
const recordsStore = useRecordsStore();

const showAddModal = ref(false);
const editingPatient = ref(null);
const saving = ref(false);
const formRef = ref(null);

const patientForm = reactive({
  name: '', gender: 1, birthDate: '', phone: '',
  idCard: '', address: '', emergencyContact: '',
  emergencyPhone: '', allergyHistory: '', medicalHistory: ''
});

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  birthDate: [{ required: true, message: '请选择出生日期', trigger: 'change' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ]
};

const getAge = (birthDate) => {
  if (!birthDate) return '?';
  return Math.floor((Date.now() - new Date(birthDate)) / (365.25 * 24 * 3600 * 1000));
};

const maskPhone = (phone) => {
  if (!phone || phone.length < 7) return phone || '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

const getCount = (type, patientId) => {
  if (type === 'records') return recordsStore.getPatientRecords(patientId).length;
  if (type === 'lab') return labStore.getPatientReports(patientId).length;
  if (type === 'imaging') return imagingStore.getPatientReports(patientId).length;
  if (type === 'invoice') return invoiceStore.getPatientInvoices(patientId).length;
  return 0;
};

const triggerAvatarUpload = (patient) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/bmp';
  input.onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { ElMessage.error('头像文件不能超过5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => openAvatarEditorWithNewImage(patient, ev.target.result);
    reader.readAsDataURL(file);
  };
  input.click();
};

// 【新增】直接打开编辑器（用于点击已有头像）
const openAvatarEditor = (patient) => {
  const sourceData = patient.avatarOriginal || patient.avatar;
  if (!sourceData) {
    // 没有头像时走上传流程
    triggerAvatarUpload(patient);
    return;
  }
  openAvatarEditorCore(patient, sourceData, null);
};

// 【新增】上传新图片后打开编辑器
const openAvatarEditorWithNewImage = (patient, imgDataUrl) => {
  openAvatarEditorCore(patient, imgDataUrl, imgDataUrl);
};

const openAvatarEditorCore = (patient, sourceData, newImageData) => {
  // sourceData 由调用方传入：openAvatarEditor时取avatarOriginal，上传新图时取新图数据

  let currentZoom = 100;
  let posX = 0, posY = 0;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;

  // 构建编辑器 DOM
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';

  overlay.innerHTML = `
    <div style="background:white;border-radius:12px;padding:28px 32px;min-width:320px;max-width:90vw;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <div style="font-size:16px;font-weight:600;margin-bottom:18px;color:#333;">✂️ 裁剪头像</div>
      <!-- 【修改】预览框100x100（再缩小50%），内部图片用object-fit:contain完整显示 -->
      <div id="av-preview-wrap" style="width:100px;height:100px;border-radius:50%;overflow:hidden;margin:0 auto 16px;background:#f5f5f5;border:3px solid #ddd;cursor:grab;position:relative;display:flex;align-items:center;justify-content:center;">
        <img id="av-img" src="${sourceData}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;transform-origin:center;user-select:none;pointer-events:none;">
      </div>
      <div style="margin-bottom:8px;font-size:12px;color:#888;">滚轮缩放 / 拖动调整位置</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
        <span style="font-size:12px;color:#aaa;">50%</span>
        <input id="av-zoom" type="range" min="50" max="300" value="100" style="flex:1;">
        <span style="font-size:12px;color:#aaa;">300%</span>
        <span id="av-zoom-label" style="font-size:12px;color:#555;min-width:36px;">100%</span>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button id="av-cancel" style="padding:8px 24px;border-radius:6px;border:1px solid #ddd;background:white;cursor:pointer;font-size:14px;">取消</button>
        <button id="av-confirm" style="padding:8px 24px;border-radius:6px;border:none;background:#409eff;color:white;cursor:pointer;font-size:14px;">确认</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const previewImg = overlay.querySelector('#av-img');
  const zoomSlider = overlay.querySelector('#av-zoom');
  const zoomLabel = overlay.querySelector('#av-zoom-label');
  const wrap = overlay.querySelector('#av-preview-wrap');

  const updateTransform = () => {
    const s = currentZoom / 100;
    // 【修复】translate在scale之前，确保拖动偏移量是屏幕像素，不被缩放影响
    previewImg.style.transform = `translate(${posX}px, ${posY}px) scale(${s})`;
  };

  // 滑块缩放
  zoomSlider.oninput = () => {
    currentZoom = parseInt(zoomSlider.value);
    zoomLabel.textContent = currentZoom + '%';
    updateTransform();
  };

  // 滚轮缩放
  wrap.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    currentZoom = Math.min(300, Math.max(50, currentZoom - ev.deltaY * 0.1));
    zoomSlider.value = Math.round(currentZoom);
    zoomLabel.textContent = Math.round(currentZoom) + '%';
    updateTransform();
  }, { passive: false });

  // 拖动（灵敏度降低50%，图片移动速度为鼠标的一半）
  const DRAG_SENSITIVITY = 0.5;
  let startPosX = 0, startPosY = 0;
  wrap.addEventListener('mousedown', (ev) => {
    isDragging = true;
    // 【修复】记录鼠标按下时的位置和当前图片位置
    dragStartX = ev.clientX;
    dragStartY = ev.clientY;
    startPosX = posX;
    startPosY = posY;
    wrap.style.cursor = 'grabbing';
  });
  document.addEventListener('mousemove', (ev) => {
    if (!isDragging) return;
    // 【修复】只对鼠标移动增量应用灵敏度
    const deltaX = (ev.clientX - dragStartX) * DRAG_SENSITIVITY;
    const deltaY = (ev.clientY - dragStartY) * DRAG_SENSITIVITY;
    posX = startPosX + deltaX;
    posY = startPosY + deltaY;
    updateTransform();
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
    wrap.style.cursor = 'grab';
  });

  // 取消
  overlay.querySelector('#av-cancel').onclick = () => document.body.removeChild(overlay);

  // Confirm: canvas bake → upload to OSS → store URL
  overlay.querySelector('#av-confirm').onclick = () => {
    const img = new Image();
    img.onload = async () => {
      // Canvas size 300x300 for high quality avatar
      const PREVIEW_SIZE = 100;
      const OUTPUT_SIZE = 300;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = PREVIEW_SIZE;
      tempCanvas.height = PREVIEW_SIZE;
      const tempCtx = tempCanvas.getContext('2d');

      tempCtx.fillStyle = '#f5f5f5';
      tempCtx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

      const imgAspect = img.width / img.height;
      let drawW, drawH;
      if (imgAspect > 1) {
        drawW = PREVIEW_SIZE;
        drawH = PREVIEW_SIZE / imgAspect;
      } else {
        drawH = PREVIEW_SIZE;
        drawW = PREVIEW_SIZE * imgAspect;
      }

      const scale = currentZoom / 100;
      tempCtx.save();
      tempCtx.translate(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2);
      tempCtx.translate(posX, posY);
      tempCtx.scale(scale, scale);
      tempCtx.drawImage(img, 0, 0, img.width, img.height, -drawW/2, -drawH/2, drawW, drawH);
      tempCtx.restore();

      // Scale up to OUTPUT_SIZE for better display quality
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = OUTPUT_SIZE;
      finalCanvas.height = OUTPUT_SIZE;
      const finalCtx = finalCanvas.getContext('2d');
      finalCtx.drawImage(tempCanvas, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      document.body.removeChild(overlay);

      // Convert canvas to Blob and upload to OSS
      try {
        const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', 0.9));
        const fileName = `avatar_${patient.id}_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        ElMessage.info('正在上传头像...');
        const ossUrl = await uploadFileToCloud(file, 'avatars');
        console.log('[Avatar] Uploaded to OSS:', ossUrl);
        // Store OSS URL, remove old base64 data to save localStorage space
        patientsStore.updatePatient({
          ...patient,
          avatar: ossUrl,
          avatarUrl: ossUrl,
          avatarOriginal: undefined
        });
        ElMessage.success('头像更新成功');
      } catch (e) {
        console.error('[Avatar] Upload failed:', e);
        ElMessage.error('头像上传失败: ' + (e.message || '网络错误'));
      }
    };
    img.src = sourceData;
  };
};

const resetForm = () => {
  Object.assign(patientForm, {
    name: '', gender: 1, birthDate: '', phone: '',
    idCard: '', address: '', emergencyContact: '',
    emergencyPhone: '', allergyHistory: '', medicalHistory: ''
  });
  editingPatient.value = null;
};

const closeModal = () => { showAddModal.value = false; resetForm(); };

const editPatient = (patient) => {
  editingPatient.value = patient;
  Object.assign(patientForm, {
    name: patient.name, gender: patient.gender, birthDate: patient.birthDate,
    phone: patient.phone, idCard: patient.idCard || '', address: patient.address || '',
    emergencyContact: patient.emergencyContact || '', emergencyPhone: patient.emergencyPhone || '',
    allergyHistory: patient.allergyHistory || '', medicalHistory: patient.medicalHistory || ''
  });
  showAddModal.value = true;
};

const viewDetail = (patient) => {
  router.push({ name: 'PatientDetail', params: { id: patient.id } });
};

const savePatient = async () => {
  await formRef.value?.validate();
  saving.value = true;
  try {
    if (editingPatient.value) {
      await patientsStore.updatePatient({ ...editingPatient.value, ...patientForm });
      ElMessage.success('患者信息更新成功');
    } else {
      await patientsStore.addPatient({ ...patientForm });
      ElMessage.success('患者添加成功');
    }
    closeModal();
  } catch (e) {
    ElMessage.error(e.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (patient) => {
  ElMessageBox.confirm(`确定删除患者 ${patient.name} 的所有数据吗？此操作不可恢复！`, '确认删除', {
    type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消'
  }).then(async () => {
    await patientsStore.deletePatient(patient.id);
    ElMessage.success('删除成功');
  }).catch(() => {});
};
</script>

<style scoped>
.patients-page {
  padding: 1rem 1.5rem;
  background: var(--color-bg);
  min-height: calc(100vh - 60px);
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  background: var(--color-surface);
  padding: 1rem 1.5rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
}
.patient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.1rem;
}
.patient-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: var(--transition-card);
  position: relative;
  overflow: hidden;
  animation: cardFadeIn 0.35s ease both;
}
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.patient-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-mid) 100%);
  transition: height 0.22s ease;
}
.patient-card:hover {
  transform: var(--card-hover-lift);
  box-shadow: var(--card-hover-shadow);
  border-color: rgba(18,81,163,0.25);
}
.patient-card:hover::before {
  height: 4px;
}
/* 卡片名称和元信息 */
.patient-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.patient-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.82rem;
  color: var(--color-text-sub);
  flex-wrap: wrap;
}
.gender-tag {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
}
.gender-male   { background: #dbeafe; color: #1d4ed8; }
.gender-female { background: #fce7f3; color: #9d174d; }
.patient-contact {
  font-size: 0.83rem;
  color: var(--color-text-sub);
  margin-bottom: 0.8rem;
  line-height: 1.6;
}
/* 数据统计pill */
.patient-stats {
  display: flex;
  gap: 6px;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}
.stat-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 12px;
}
.stat-num { font-weight: 700; font-size: 13px; }
.stat-lbl { opacity: 0.8; }
.stat-pill-blue   { background: #dbeafe; color: #1d4ed8; }
.stat-pill-purple { background: #ede9fe; color: #6d28d9; }
.stat-pill-teal   { background: #d1fae5; color: #065f46; }
.stat-pill-orange { background: #ffedd5; color: #9a3412; }
/* 操作按钮行 */
.patient-actions {
  display: flex;
  gap: 6px;
}
.avatar-circle {
  width: 52px; height: 52px;
  border-radius: 50%;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-primary-light);
  border: 2.5px solid var(--color-primary);
  margin-right: 0.75rem;
  flex-shrink: 0;
}
.avatar-edit-btn {
  position: absolute; top: 0.85rem; right: 0.85rem;
  padding: 4px 10px;
  background: var(--color-primary); color: white;
  border: none; border-radius: var(--radius-sm);
  cursor: pointer; font-size: 12px;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
}
.avatar-edit-btn:hover { filter: brightness(1.15); }
.badge {
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 500;
}
.badge-blue   { background: #dbeafe; color: #1d4ed8; }
.badge-purple { background: #ede9fe; color: #6d28d9; }
.badge-green  { background: #dcfce7; color: #15803d; }
.badge-red    { background: #fee2e2; color: #b91c1c; }
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem 2rem;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  border: 2px dashed var(--color-border);
  color: var(--color-text-tip);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .patients-page { padding: 0.8rem; }
  .page-header { padding: 0.75rem 1rem; flex-wrap: wrap; gap: 0.5rem; }
  .patient-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.8rem; }
  .patient-card { padding: 1rem; }
}
@media (max-width: 576px) {
  .patients-page { padding: 0.5rem; }
  .page-header { flex-direction: column; align-items: stretch; gap: 0.6rem; }
  .patient-grid { grid-template-columns: 1fr; gap: 0.6rem; }
  .avatar-circle { width: 44px; height: 44px; }
  .badge { font-size: 11px; padding: 2px 6px; }
}
@media (max-width: 480px) {
  .patient-card { padding: 0.85rem; }
  .avatar-edit-btn { top: 0.6rem; right: 0.6rem; padding: 3px 8px; font-size: 11px; }
}
</style>

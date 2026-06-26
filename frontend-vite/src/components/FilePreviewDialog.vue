<template>
  <el-dialog
    v-model="visible"
    :title="`${patient?.name || ''} - ${formatDate(record?.date || '')}`"
    width="90vw"
    :style="{ maxWidth: '1200px' }"
    top="5vh"
    :close-on-click-modal="true"
    @open="openAtIndex(0)"
    class="file-preview-dialog"
  >
    <template #header>
      <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
        <div>
          <span style="font-weight:600; font-size:15px; color:#333;">
            {{ patient?.name }} - {{ formatDate(record?.date || '') }}
          </span>
          <span style="font-size:12px; color:#999; margin-left:12px;">
            第 {{ currentIdx + 1 }} / {{ files.length }} 个文件
            <template v-if="files[currentIdx]">- {{ files[currentIdx].name || '' }}</template>
          </span>
        </div>
        <div style="display:flex; gap:8px;">
          <el-button size="small" type="success" @click="downloadCurrent">💾 下载</el-button>
          <el-button v-if="record" size="small" type="danger" @click="handleDelete">🗑 删除病历</el-button>
        </div>
      </div>
    </template>

    <!-- 预览区 -->
    <div
      ref="previewAreaRef"
      class="preview-area"
      @wheel.prevent="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- 图片 -->
      <img
        v-if="isImage"
        :src="currentFile?.url"
        :style="previewStyle"
        class="preview-img"
        draggable="false"
      />
      <!-- PDF -->
      <iframe
        v-else-if="isPdf"
        :src="pdfSrc"
        style="width:100%; height:100%; border:none;"
      />
      <!-- 无数据 -->
      <div v-else-if="!currentFile?.url || currentFile.url === '#'" class="no-preview">
        📭 无预览数据
      </div>
      <!-- 不支持 -->
      <div v-else class="no-preview">
        📄 {{ currentFile?.name || '未知文件' }}<br>
        <span style="font-size:13px;">不支持预览此类型，请下载查看</span>
      </div>
    </div>

    <!-- 底部导航 -->
    <template #footer>
      <div v-if="files.length > 1" style="display:flex; align-items:center; justify-content:center; gap:16px;">
        <el-button :disabled="currentIdx === 0" @click="go(-1)">◀ 上一个</el-button>
        <span style="font-size:13px; color:#666;">{{ currentIdx + 1 }} / {{ files.length }}</span>
        <el-button :disabled="currentIdx === files.length - 1" @click="go(1)">下一个 ▶</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatDate } from '@/utils/index';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  files: { type: Array, default: () => [] },
  patient: { type: Object, default: null },
  record: { type: Object, default: null }
});
const emit = defineEmits(['update:modelValue', 'delete-record']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
});

const currentIdx = ref(0);
const zoomLevel = ref(1);
const panPos = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const previewAreaRef = ref(null);
const pdfSrc = ref('');

const currentFile = computed(() => props.files[currentIdx.value] || null);

const isImage = computed(() =>
  currentFile.value?.type?.startsWith('image/') ||
  /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(currentFile.value?.name || '')
);
const isPdf = computed(() =>
  currentFile.value?.type?.includes('pdf') ||
  /\.pdf$/i.test(currentFile.value?.name || '')
);

const previewStyle = computed(() => ({
  transform: `scale(${zoomLevel.value}) translate(${panPos.value.x}px, ${panPos.value.y}px)`,
  transformOrigin: 'center center',
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  userSelect: 'none',
  cursor: isPanning.value ? 'grabbing' : 'grab'
}));

const openAtIndex = (idx) => {
  currentIdx.value = idx;
  zoomLevel.value = 1;
  panPos.value = { x: 0, y: 0 };
  loadPdfSrc();
};

const loadPdfSrc = () => {
  if (!isPdf.value || !currentFile.value?.url) return;
  if (currentFile.value.url.startsWith('data:')) {
    try {
      const parts = currentFile.value.url.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const binaryStr = atob(parts[1]);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      pdfSrc.value = URL.createObjectURL(blob);
    } catch (e) { pdfSrc.value = ''; }
  } else {
    pdfSrc.value = currentFile.value.url;
  }
};

watch(currentIdx, () => {
  zoomLevel.value = 1;
  panPos.value = { x: 0, y: 0 };
  loadPdfSrc();
});

watch(() => props.modelValue, (v) => { if (v) openAtIndex(0); });

const go = (delta) => {
  const next = currentIdx.value + delta;
  if (next >= 0 && next < props.files.length) currentIdx.value = next;
};

// Zoom
const onWheel = (e) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  zoomLevel.value = Math.max(0.2, Math.min(5, zoomLevel.value + delta));
};

// Pan - mouse
const onMouseDown = (e) => {
  if (e.target.tagName === 'IFRAME') return;
  isPanning.value = true;
  panStart.value = {
    x: e.clientX - panPos.value.x * zoomLevel.value,
    y: e.clientY - panPos.value.y * zoomLevel.value
  };
  e.preventDefault();
};
const onMouseMove = (e) => {
  if (!isPanning.value) return;
  panPos.value = {
    x: (e.clientX - panStart.value.x) / zoomLevel.value,
    y: (e.clientY - panStart.value.y) / zoomLevel.value
  };
};
const onMouseUp = () => { isPanning.value = false; };

// Pan - touch
const onTouchStart = (e) => {
  if (e.target.tagName === 'IFRAME') return;
  isPanning.value = true;
  const t = e.touches[0];
  panStart.value = {
    x: t.clientX - panPos.value.x * zoomLevel.value,
    y: t.clientY - panPos.value.y * zoomLevel.value
  };
};
const onTouchMove = (e) => {
  if (!isPanning.value) return;
  const t = e.touches[0];
  panPos.value = {
    x: (t.clientX - panStart.value.x) / zoomLevel.value,
    y: (t.clientY - panStart.value.y) / zoomLevel.value
  };
};
const onTouchEnd = () => { isPanning.value = false; };

// Keyboard navigation
const onKeyDown = (e) => {
  if (!visible.value) return;
  if (e.key === 'ArrowLeft') go(-1);
  if (e.key === 'ArrowRight') go(1);
  if (e.key === 'Escape') visible.value = false;
};
onMounted(() => document.addEventListener('keydown', onKeyDown));
onUnmounted(() => document.removeEventListener('keydown', onKeyDown));

// Delete record
const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确认删除该病历记录？此操作不可恢复。', '删除确认', { type: 'warning' });
    emit('delete-record', props.record);
    visible.value = false;
  } catch (_) {}
};

// Download
const downloadCurrent = () => {
  const file = currentFile.value;
  if (!file?.url || file.url === '#') {
    ElMessage.warning('此文件无下载数据');
    return;
  }
  const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'application/pdf': '.pdf' };
  const ext = file.name?.includes('.') ? '.' + file.name.split('.').pop().toLowerCase()
    : (extMap[file.type] || '.bin');
  const safeName = `${props.patient?.name || '患者'}_${props.record?.date || ''}${ext}`
    .replace(/[\\/:*?"<>|]/g, '_');

  try {
    let blobUrl = file.url;
    if (file.url.startsWith('data:')) {
      const parts = file.url.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bin = atob(parts[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
    }
    const a = document.createElement('a');
    a.href = blobUrl; a.download = safeName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    if (file.url.startsWith('data:')) setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    ElMessage.success(`正在下载: ${safeName}`);
  } catch (e) {
    ElMessage.error('下载失败，请重试');
  }
};
</script>

<style scoped>
.preview-area {
  width: 100%;
  height: 70vh;
  background: #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  border-radius: 6px;
}
.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}
.no-preview {
  color: #999;
  font-size: 16px;
  text-align: center;
  padding: 40px;
}
</style>

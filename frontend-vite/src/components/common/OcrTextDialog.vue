<template>
  <el-dialog
    :model-value="visible"
    title="📝 OCR识别原文"
    width="700px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <pre v-if="!editing" class="ocr-pre">{{ displayText }}</pre>
    <el-input
      v-else
      v-model="editText"
      type="textarea"
      :rows="16"
      placeholder="OCR 识别原文"
    />
    <template #footer>
      <template v-if="!editing">
        <div class="ocr-dialog-footer">
          <span v-if="reportId && reportType === 'lab'" class="ocr-hint">
            保存后，点击「重新解析OCR」以更新表格数据
          </span>
          <div class="ocr-dialog-actions">
            <el-button v-if="reportId" type="primary" @click="startEdit">修改</el-button>
            <el-button @click="$emit('update:visible', false)">关闭</el-button>
          </div>
        </div>
      </template>
      <template v-else>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
        <el-button @click="cancelEdit">取消</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { patchLabOcrText } from '@/api/lab-reports';
import { patchImagingOcrText } from '@/api/imaging-reports';

const props = defineProps({
  visible: { type: Boolean, default: false },
  text: { type: String, default: '' },
  reportId: { type: [Number, String], default: null },
  reportType: { type: String, default: '' }
});

const emit = defineEmits(['update:visible', 'saved']);

const editing = ref(false);
const editText = ref('');
const saving = ref(false);

const displayText = computed(() => props.text || '（暂无 OCR 原文）');

watch(() => props.visible, (v) => {
  if (v) {
    editing.value = false;
    editText.value = props.text || '';
  }
});

watch(() => props.text, (v) => {
  if (!editing.value) editText.value = v || '';
});

function startEdit() {
  editText.value = props.text || '';
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
  editText.value = props.text || '';
}

async function saveEdit() {
  if (!props.reportId) return;
  saving.value = true;
  try {
    if (props.reportType === 'lab') {
      await patchLabOcrText(props.reportId, editText.value);
    } else if (props.reportType === 'imaging') {
      await patchImagingOcrText(props.reportId, editText.value);
    } else {
      throw new Error('未知报告类型');
    }
    ElMessage.success('OCR 原文已保存');
    editing.value = false;
    emit('saved', editText.value);
    emit('update:visible', false);
  } catch (e) {
    ElMessage.error(e.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.ocr-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.ocr-hint {
  font-size: 12px;
  color: #888;
  line-height: 1.4;
  flex: 1;
  text-align: left;
}

.ocr-dialog-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.ocr-pre {
  white-space: pre-wrap;
  font-size: 13px;
  color: #333;
  max-height: 60vh;
  overflow-y: auto;
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  line-height: 1.6;
}
</style>

<template>
  <el-dialog :model-value="visible" title="📝 OCR识别原文" width="700px" @update:model-value="$emit('update:visible', $event)">
    <pre class="ocr-pre">{{ text }}</pre>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  text: { type: String, default: '' }
});

defineEmits(['update:visible']);
</script>

<style scoped>
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

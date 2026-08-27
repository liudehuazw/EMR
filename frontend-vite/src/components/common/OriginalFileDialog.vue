<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="90vw"
    style="max-width:1000px;"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="preview-wrap">
      <iframe v-if="isPdf" :src="url" class="preview-iframe" />
      <img v-else :src="url" class="preview-img" alt="" />
    </div>
    <template #footer>
      <el-button @click="openInNewTab">↗ 新窗口打开</el-button>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  url: { type: String, default: '' },
  isPdf: { type: Boolean, default: false },
  title: { type: String, default: '📄 原报告' }
});

defineEmits(['update:visible']);

function openInNewTab() {
  if (props.url) window.open(props.url, '_blank');
}
</script>

<style scoped>
.preview-wrap {
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  border-radius: 8px;
  overflow: hidden;
}
.preview-iframe { width: 100%; height: 75vh; border: none; }
.preview-img { max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px; }
</style>

<template>
  <div class="ai-panel">
    <div class="ai-panel-header">
      <img src="/pic/DeepSeek.png" class="ai-icon" alt="" />
      AI智能分析
    </div>
    <div class="ai-panel-body">
      <div v-if="loading" class="ai-state">
        <div class="ai-state-icon">🔬</div>
        <div class="ai-state-text">AI正在分析中...</div>
      </div>
      <div v-else-if="result" class="ai-result">{{ result }}</div>
      <div v-else-if="error" class="ai-state ai-error">
        <div class="ai-state-icon">⚠️</div>
        <div class="ai-state-text">{{ error }}</div>
        <el-button size="small" style="margin-top:12px;" @click="$emit('retry')">🔄 重试</el-button>
      </div>
      <div v-else class="ai-state">
        <img src="/pic/DeepSeek.png" class="ai-placeholder-icon" alt="" />
        <div class="ai-state-text">点击上方「AI智能分析」按钮</div>
        <div class="ai-hint">{{ emptyHint }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  result: { type: String, default: '' },
  error: { type: String, default: '' },
  emptyHint: { type: String, default: '基于报告数据进行AI智能解读' }
});

defineEmits(['retry']);
</script>

<style scoped>
.ai-panel {
  flex: 1;
  background: #fafaff;
  border: 1px solid #e0e0ff;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ai-panel-header {
  padding: 10px 14px;
  background: #e8e8ff;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  border-bottom: 1px solid #d0d0ff;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ai-icon { height: 16px; opacity: 0.7; }
.ai-panel-body { flex: 1; padding: 16px; overflow-y: auto; }
.ai-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  text-align: center;
  color: #aaa;
}
.ai-state-icon { font-size: 2.5rem; margin-bottom: 16px; }
.ai-placeholder-icon { height: 36px; opacity: 0.35; margin-bottom: 14px; }
.ai-state-text { font-size: 14px; color: #555; }
.ai-hint { font-size: 12px; margin-top: 4px; color: #aaa; }
.ai-error .ai-state-text { color: #ef4444; }
.ai-result {
  white-space: pre-wrap;
  line-height: 1.8;
  font-size: 14px;
  color: #333;
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e8e8ff;
}
</style>

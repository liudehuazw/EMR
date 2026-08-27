<template>
  <div class="trend-section">
    <div class="trend-header">
      <span class="trend-title">📈 趋势分析</span>
      <select
        :value="trendItem"
        class="trend-select"
        @change="$emit('update:trendItem', $event.target.value); $emit('render')"
      >
        <option value="">-- 选择检验项目 --</option>
        <option v-for="item in trendItems" :key="item" :value="item">{{ item }}</option>
      </select>
    </div>
    <div v-if="trendItem" class="trend-chart-box">
      <canvas ref="canvasEl" class="trend-canvas" />
    </div>
    <div v-else class="trend-empty">选择一个检验项目查看数值变化趋势</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  trendItem: { type: String, default: '' },
  trendItems: { type: Array, default: () => [] }
});

defineEmits(['update:trendItem', 'render']);

const canvasEl = ref(null);
defineExpose({ canvasEl });
</script>

<style scoped>
.trend-section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}
.trend-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.trend-title { font-weight: 600; font-size: 14px; color: #444; }
.trend-select {
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 13px;
  min-width: 180px;
  cursor: pointer;
}
.trend-chart-box {
  background: white;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #eee;
  min-height: 350px;
}
.trend-canvas { width: 100%; height: 400px; }
.trend-empty {
  text-align: center;
  color: #bbb;
  padding: 40px;
  font-size: 13px;
}
</style>

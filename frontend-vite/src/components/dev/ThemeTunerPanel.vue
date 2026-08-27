<template>
  <div class="theme-tuner">
    <button
      type="button"
      class="theme-tuner-fab"
      title="主题调色板（开发工具）"
      @click="togglePanel"
    >
      🎨
    </button>

    <el-drawer
      v-model="state.panelOpen"
      title="🎨 实时主题调色板"
      direction="rtl"
      size="360px"
      :z-index="10001"
      class="theme-tuner-drawer"
    >
      <p class="theme-tuner-hint">
        修改后立即生效，可保存到浏览器本地。确认配色后复制 CSS 写入 <code>main.css</code>。
      </p>

      <el-collapse v-model="activeGroups">
        <el-collapse-item
          v-for="group in groups"
          :key="group.id"
          :title="group.label"
          :name="group.id"
        >
          <div
            v-for="token in group.tokens"
            :key="token.var"
            class="token-row"
          >
            <label class="token-label" :title="token.var">{{ token.label }}</label>
            <el-color-picker
              v-if="token.type === 'color'"
              :model-value="normalizeColor(state.values[token.var] || token.default)"
              show-alpha
              @update:model-value="(v) => onColorChange(token.var, v)"
            />
            <el-input
              v-else
              :model-value="state.values[token.var] ?? token.default"
              size="small"
              @update:model-value="(v) => setValue(token.var, v)"
            />
            <code class="token-var">{{ token.var }}</code>
          </div>
        </el-collapse-item>
      </el-collapse>

      <div class="theme-tuner-actions">
        <el-button type="primary" @click="handleSave">💾 保存到本地</el-button>
        <el-button @click="handleCopy">📋 复制 CSS</el-button>
        <el-button type="danger" plain @click="handleReset">↺ 重置默认</el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useThemeTuner } from '@/composables/useThemeTuner';

const {
  groups,
  state,
  setValue,
  saveToLocal,
  resetAll,
  copyCss,
  togglePanel
} = useThemeTuner();

const activeGroups = ref(groups.map((g) => g.id));

function normalizeColor(value) {
  if (!value) return '#000000';
  if (value.startsWith('#')) return value;
  return '#000000';
}

function onColorChange(varName, value) {
  if (!value) return;
  setValue(varName, value);
}

async function handleSave() {
  saveToLocal();
  ElMessage.success('主题已保存到浏览器本地');
}

async function handleCopy() {
  try {
    await copyCss();
    ElMessage.success('已复制 :root CSS 变量到剪贴板');
  } catch {
    ElMessage.error('复制失败，请手动复制');
  }
}

async function handleReset() {
  try {
    await ElMessageBox.confirm('确定恢复所有设计令牌为默认值？', '重置主题', { type: 'warning' });
    resetAll();
    ElMessage.success('已恢复默认主题');
  } catch {
    /* cancelled */
  }
}
</script>

<style scoped>
.theme-tuner-fab {
  position: fixed;
  left: 20px;
  bottom: 24px;
  z-index: 10000;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.45);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.theme-tuner-fab:hover {
  transform: scale(1.06);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.55);
}

.theme-tuner-hint {
  font-size: 12px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 12px;
  padding: 10px 12px;
  background: #f5f7ff;
  border-radius: 8px;
  border: 1px solid #e0e7ff;
}

.theme-tuner-hint code {
  font-size: 11px;
  background: #e8ecff;
  padding: 1px 4px;
  border-radius: 4px;
}

.token-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 6px 10px;
  align-items: center;
  margin-bottom: 12px;
}

.token-label {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.token-var {
  grid-column: 1 / -1;
  font-size: 11px;
  color: #999;
  background: #f8f8f8;
  padding: 2px 6px;
  border-radius: 4px;
}

.theme-tuner-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.theme-tuner-actions .el-button {
  margin: 0;
  width: 100%;
}
</style>

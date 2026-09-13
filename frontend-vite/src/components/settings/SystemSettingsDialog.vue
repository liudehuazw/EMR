<template>
  <el-dialog
    :model-value="visible"
    title="⚙ 系统设置"
    width="560px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane v-if="isAdmin" label="存储方式" name="storage">
        <el-radio-group v-model="storageType" style="display:flex; flex-direction:column; align-items:flex-start; gap:12px;">
          <el-radio value="oss">阿里云 OSS</el-radio>
          <el-radio value="local">服务器本地存储</el-radio>
        </el-radio-group>
        <p style="font-size:12px; color:#888; margin-top:12px;">
          切换后仅影响新上传文件，历史文件仍保留在原存储位置。
        </p>
        <div style="margin-top:16px;">
          <el-button type="primary" :loading="storageLoading" @click="saveStorage">保存存储方式</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="AI 模型" name="ai">
        <el-form label-width="96px" label-position="left">
          <el-form-item label="接入方式">
            <el-radio-group v-model="aiForm.providerType">
              <el-radio value="ollama">本地 Ollama</el-radio>
              <el-radio value="openai_compatible">OpenAI 兼容 API</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="预设">
            <el-select v-model="aiForm.preset" style="width:100%;" @change="applyPreset">
              <el-option v-for="p in AI_PRESETS" :key="p.id" :label="p.label" :value="p.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="API URL">
            <el-input v-model="aiForm.apiUrl" placeholder="https://api.example.com/v1/chat/completions" />
          </el-form-item>
          <el-form-item label="模型 ID">
            <el-input v-model="aiForm.modelId" placeholder="例如 deepseek-chat / qwen2.5:7b" />
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="aiForm.apiKey" type="password" show-password placeholder="留空则保持已保存的 Key" />
          </el-form-item>
        </el-form>
        <div v-if="testResult" style="background:#f0f9eb; border:1px solid #b7eb8f; border-radius:8px; padding:10px 12px; font-size:13px; margin-bottom:12px;">
          验证成功 · 模型 {{ testResult.model }} · 延迟 {{ testResult.latencyMs }}ms
          <div style="color:#666; margin-top:4px;">回复预览：{{ testResult.replyPreview }}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <el-button type="primary" :loading="aiLoading" @click="saveAiConfig">保存配置</el-button>
          <el-button :loading="testLoading" @click="verifyAiConfig">在线验证</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <div class="settings-dialog-footer">
        <span class="settings-hint">服务器本地存储+本地Ollama可完全本地化处理隐私文件</span>
        <el-button @click="close">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/useAuth';
import { getStorageType, setStorageType } from '@/api/system';
import { getUserAiConfig, saveUserAiConfig, testUserAiConfig } from '@/api/user-ai-config';
import { AI_PRESETS, findPreset } from '@/constants/aiPresets';

const props = defineProps({
  visible: { type: Boolean, default: false }
});
const emit = defineEmits(['update:visible']);

const authStore = useAuthStore();
const activeTab = ref('ai');
const storageType = ref('oss');
const storageLoading = ref(false);

const aiForm = ref({
  providerType: 'openai_compatible',
  preset: 'deepseek',
  apiUrl: '',
  modelId: '',
  apiKey: ''
});
const aiLoading = ref(false);
const testLoading = ref(false);
const testResult = ref(null);

const isAdmin = computed(() => authStore.userInfo?.username === 'admin');

watch(() => props.visible, async (v) => {
  if (!v) return;
  testResult.value = null;
  activeTab.value = isAdmin.value ? 'storage' : 'ai';
  await loadSettings();
});

async function loadSettings() {
  try {
    if (isAdmin.value) {
      const storageRes = await getStorageType();
      storageType.value = storageRes.data?.storageType || 'oss';
    }
    const aiRes = await getUserAiConfig();
    const cfg = aiRes.data || {};
    aiForm.value = {
      providerType: cfg.providerType || 'openai_compatible',
      preset: cfg.preset || 'deepseek',
      apiUrl: cfg.apiUrl || findPreset('deepseek').apiUrl,
      modelId: cfg.modelId || findPreset('deepseek').modelId,
      apiKey: cfg.apiKeyMasked || ''
    };
  } catch (e) {
    ElMessage.error(e.message || '加载设置失败');
  }
}

async function saveStorage() {
  storageLoading.value = true;
  try {
    await setStorageType(storageType.value);
    ElMessage.success('存储方式已保存');
  } catch (e) {
    ElMessage.error(e.message || '保存失败');
  } finally {
    storageLoading.value = false;
  }
}

function applyPreset(presetId) {
  const preset = findPreset(presetId);
  if (preset.id === 'custom') return;
  aiForm.value.providerType = preset.providerType;
  aiForm.value.apiUrl = preset.apiUrl;
  aiForm.value.modelId = preset.modelId;
}

async function saveAiConfig() {
  aiLoading.value = true;
  try {
    await saveUserAiConfig({ ...aiForm.value });
    ElMessage.success('AI 配置已保存并生效');
    testResult.value = null;
  } catch (e) {
    ElMessage.error(e.message || '保存失败');
  } finally {
    aiLoading.value = false;
  }
}

async function verifyAiConfig() {
  testLoading.value = true;
  testResult.value = null;
  try {
    const res = await testUserAiConfig({ ...aiForm.value });
    testResult.value = res.data;
    ElMessage.success(`验证成功 (${res.data?.latencyMs}ms)`);
  } catch (e) {
    ElMessage.error(e.message || '验证失败');
  } finally {
    testLoading.value = false;
  }
}

function close() {
  emit('update:visible', false);
}
</script>

<style scoped>
.settings-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.settings-hint {
  font-size: 12px;
  color: #888;
  line-height: 1.4;
  flex: 1;
  text-align: left;
}
</style>

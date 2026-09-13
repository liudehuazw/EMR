export const AI_PRESETS = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    providerType: 'openai_compatible',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    modelId: 'deepseek-chat'
  },
  {
    id: 'qwen',
    label: '通义千问 Qwen',
    providerType: 'openai_compatible',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    modelId: 'qwen-plus'
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    providerType: 'openai_compatible',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    modelId: 'glm-4-flash'
  },
  {
    id: 'kimi',
    label: 'Kimi 月之暗面',
    providerType: 'openai_compatible',
    apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
    modelId: 'moonshot-v1-8k'
  },
  {
    id: 'ollama',
    label: '本地 Ollama',
    providerType: 'ollama',
    apiUrl: 'http://127.0.0.1:11434/v1/chat/completions',
    modelId: 'qwen2.5:7b'
  },
  {
    id: 'custom',
    label: '自定义',
    providerType: 'openai_compatible',
    apiUrl: '',
    modelId: ''
  }
];

export function findPreset(id) {
  return AI_PRESETS.find((p) => p.id === id) || AI_PRESETS[0];
}

/** 可在调色板中实时编辑的设计令牌 */
export const THEME_TUNER_STORAGE_KEY = 'emr-theme-tuner-overrides';

export const DESIGN_TOKEN_GROUPS = [
  {
    id: 'primary',
    label: '主色板',
    tokens: [
      { var: '--color-primary', label: '主色', default: '#1251a3', type: 'color' },
      { var: '--color-primary-dark', label: '主色深', default: '#0A2B5E', type: 'color' },
      { var: '--color-primary-light', label: '主色浅', default: '#e8f0fe', type: 'color' },
      { var: '--color-primary-mid', label: '主色中', default: '#1a5fbf', type: 'color' }
    ]
  },
  {
    id: 'modules',
    label: '五大模块色',
    tokens: [
      { var: '--color-patients', label: '患者档案', default: '#2563a8', type: 'color' },
      { var: '--color-records', label: '病历统计', default: '#d97706', type: 'color' },
      { var: '--color-lab', label: '检验报告', default: '#6eb329', type: 'color' },
      { var: '--color-imaging', label: '影像报告', default: '#6d4ec2', type: 'color' },
      { var: '--color-invoice', label: '发票统计', default: '#c0392b', type: 'color' }
    ]
  },
  {
    id: 'teal',
    label: '登录页蓝绿',
    tokens: [
      { var: '--color-teal', label: '蓝绿主色', default: '#0D7C7C', type: 'color' },
      { var: '--color-teal-dark', label: '蓝绿深', default: '#065656', type: 'color' },
      { var: '--color-teal-light', label: '蓝绿浅', default: '#e6f7f7', type: 'color' },
      { var: '--color-teal-mid', label: '蓝绿中', default: '#0F9B9B', type: 'color' }
    ]
  },
  {
    id: 'surface',
    label: '页面基础',
    tokens: [
      { var: '--color-bg', label: '页面背景', default: 'oklch(0.965 0 0)', type: 'text' },
      { var: '--color-surface', label: '卡片背景', default: '#ffffff', type: 'color' },
      { var: '--color-text', label: '主文字', default: 'oklch(0.145 0 0)', type: 'text' },
      { var: '--color-text-sub', label: '次要文字', default: 'oklch(0.556 0 0)', type: 'text' }
    ]
  },
  {
    id: 'lab-result',
    label: '检验结果',
    tokens: [
      { var: '--color-result-high', label: '偏高', default: '#dc2626', type: 'color' },
      { var: '--color-result-low', label: '偏低', default: '#2563eb', type: 'color' },
      { var: '--color-result-ok', label: '正常', default: '#059669', type: 'color' }
    ]
  },
  {
    id: 'radius',
    label: '圆角',
    tokens: [
      { var: '--radius-sm', label: '小圆角', default: '6px', type: 'text' },
      { var: '--radius-md', label: '中圆角', default: '8px', type: 'text' },
      { var: '--radius-lg', label: '大圆角', default: '12px', type: 'text' }
    ]
  }
];

export const ALL_DESIGN_TOKENS = DESIGN_TOKEN_GROUPS.flatMap((g) => g.tokens);

export function isThemeTunerEnabled() {
  if (import.meta.env.DEV) return true;
  if (import.meta.env.VITE_ENABLE_THEME_TUNER === 'true') return true;
  try {
    return localStorage.getItem('emr-theme-tuner-enabled') === '1'
      || new URLSearchParams(window.location.search).get('theme-tuner') === '1';
  } catch {
    return false;
  }
}

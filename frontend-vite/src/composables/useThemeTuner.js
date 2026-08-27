import { reactive, computed } from 'vue';
import {
  ALL_DESIGN_TOKENS,
  DESIGN_TOKEN_GROUPS,
  THEME_TUNER_STORAGE_KEY,
  isThemeTunerEnabled
} from '@/config/design-tokens';

const state = reactive({
  initialized: false,
  panelOpen: false,
  values: {}
});

function readDomValue(varName, fallback) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function applyVar(varName, value) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(varName, value);
  state.values[varName] = value;
}

export function initThemeTuner() {
  if (state.initialized || !isThemeTunerEnabled()) return;

  ALL_DESIGN_TOKENS.forEach((token) => {
    state.values[token.var] = readDomValue(token.var, token.default);
  });

  try {
    const saved = JSON.parse(localStorage.getItem(THEME_TUNER_STORAGE_KEY) || '{}');
    Object.entries(saved).forEach(([varName, value]) => {
      if (typeof value === 'string' && value) applyVar(varName, value);
    });
  } catch {
    /* ignore */
  }

  state.initialized = true;
}

export function useThemeTuner() {
  const enabled = computed(() => isThemeTunerEnabled());

  const getValue = (varName, fallback = '') => state.values[varName] || fallback;

  const setValue = (varName, value) => {
    applyVar(varName, value);
  };

  const saveToLocal = () => {
    localStorage.setItem(THEME_TUNER_STORAGE_KEY, JSON.stringify({ ...state.values }));
  };

  const resetAll = () => {
    localStorage.removeItem(THEME_TUNER_STORAGE_KEY);
    ALL_DESIGN_TOKENS.forEach((token) => {
      document.documentElement.style.removeProperty(token.var);
      state.values[token.var] = token.default;
    });
  };

  const exportCss = () => {
    const lines = ALL_DESIGN_TOKENS
      .map((token) => {
        const value = state.values[token.var] ?? token.default;
        return `  ${token.var}: ${value};`;
      })
      .join('\n');
    return `:root {\n${lines}\n}`;
  };

  const copyCss = async () => {
    const css = exportCss();
    await navigator.clipboard.writeText(css);
    return css;
  };

  const togglePanel = () => {
    state.panelOpen = !state.panelOpen;
  };

  return {
    enabled,
    groups: DESIGN_TOKEN_GROUPS,
    state,
    getValue,
    setValue,
    saveToLocal,
    resetAll,
    exportCss,
    copyCss,
    togglePanel
  };
}

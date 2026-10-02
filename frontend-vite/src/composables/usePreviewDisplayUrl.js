import { ref, watch, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { loadPreviewDisplayUrl } from '@/utils/filePreview';

/**
 * Resolve file URL to something safe for <img>/<iframe> (blob for local JWT preview).
 * @param {import('vue').WatchSource<string|undefined|null>} source
 */
export function usePreviewDisplayUrl(source) {
  const previewSrc = ref('');
  let revoke = null;

  const clear = () => {
    if (revoke) {
      revoke();
      revoke = null;
    }
    previewSrc.value = '';
  };

  const reload = async () => {
    clear();
    const raw = typeof source === 'function' ? source() : source?.value;
    if (!raw || raw === '#') return;
    try {
      const result = await loadPreviewDisplayUrl(raw);
      previewSrc.value = result.url;
      revoke = result.revoke;
    } catch (e) {
      console.warn('[usePreviewDisplayUrl]', e);
      ElMessage.error(e.message || '预览加载失败');
    }
  };

  watch(source, reload, { immediate: true });
  onUnmounted(clear);

  return { previewSrc, reload, clear };
}

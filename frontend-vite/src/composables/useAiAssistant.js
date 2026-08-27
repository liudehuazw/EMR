import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { chatWithAssistant } from '@/api/ai';
import { usePatientsStore } from '@/stores/usePatients';
import { usePatientScope } from '@/stores/usePatientScope';

/**
 * AI assistant chat state + logic.
 * Scope rules:
 *  - 患者列表页 (/patients)          -> 可查询所有患者 (contextPatientId = null)
 *  - 患者详情页 (/patients/:id)      -> 锁定该患者
 *  - 病历/检验/影像/发票模块         -> 锁定"当前选中患者"（全局 patientScope，由各模块 tab 选择写入）
 */
export function useAiAssistant() {
  const route = useRoute();
  const patientsStore = usePatientsStore();
  const patientScope = usePatientScope();

  const open = ref(false);
  const busy = ref(false);
  const currentTool = ref('');
  const messages = ref([]);
  const input = ref('');
  let abortController = null;

  const contextPatientId = computed(() => {
    if (route.name === 'Patients') return null;
    if (route.name === 'PatientDetail') {
      const id = Number(route.params.id);
      return Number.isFinite(id) && id > 0 ? id : null;
    }
    // 模块页：读取全局"当前选中患者"（tab 点击或路由进入时写入）
    return patientScope.currentPatientId;
  });

  const scoped = computed(() => contextPatientId.value != null);

  const currentPatient = computed(() =>
    scoped.value ? patientsStore.getPatientById(contextPatientId.value) : null
  );

  const suggestions = computed(() => {
    if (scoped.value) {
      const name = currentPatient.value?.name || '这位患者';
      return [
        `${name}今年以来总共花了多少钱？`,
        `${name}最近有哪些异常的检验指标？`,
        `帮我总结${name}的病历记录`,
        `${name}的检验指标趋势如何？`
      ];
    }
    return [
      '帮我找某位患者的档案',
      '某位患者在某阶段的花费是多少？',
      '某位患者最近有哪些异常指标？',
      '某位患者的检验指标趋势？'
    ];
  });

  const scopeLabel = computed(() =>
    scoped.value
      ? `已锁定患者：${currentPatient.value?.name || '#' + contextPatientId.value}`
      : '全部患者数据'
  );

  async function send(text) {
    const content = (text ?? input.value).trim();
    if (!content || busy.value) return;

    // history = existing conversation (before this turn)
    const history = messages.value
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    if (text) input.value = '';
    messages.value.push({ role: 'user', content });
    const assistant = { role: 'assistant', content: '', sources: [], streaming: true, error: '' };
    messages.value.push(assistant);

    busy.value = true;
    currentTool.value = '';
    abortController = new AbortController();

    try {
      await chatWithAssistant(
        {
          message: content,
          history,
          contextPatientId: contextPatientId.value
        },
        {
          signal: abortController.signal,
          onDelta: (c) => { assistant.content += c; },
          onTool: (name) => { currentTool.value = name; },
          onSources: (srcs) => { assistant.sources = srcs; },
          onDone: () => { assistant.streaming = false; },
          onError: (msg) => { assistant.error = msg; assistant.streaming = false; }
        }
      );
    } catch (e) {
      if (e?.name === 'AbortError') {
        assistant.error = '已停止';
      } else {
        assistant.error = e?.message || '请求失败';
      }
      assistant.streaming = false;
    } finally {
      busy.value = false;
      currentTool.value = '';
      abortController = null;
    }
  }

  function stop() {
    abortController?.abort();
  }

  /** 返回 AI 助手首页：清空对话回到欢迎页 */
  function reset() {
    abortController?.abort();
    messages.value = [];
    input.value = '';
    currentTool.value = '';
    busy.value = false;
  }

  return {
    open, busy, currentTool, messages, input,
    scoped, currentPatient, suggestions, scopeLabel,
    send, stop, reset
  };
}

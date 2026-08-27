import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * 全局"当前选中患者"状态。
 * 病历/检验/影像/发票等模块页在选中患者（tab 点击 / 路由进入）时写入，
 * AI 助手据此限定查询范围 —— 只有患者列表页允许查询所有患者。
 */
export const usePatientScope = defineStore('patientScope', () => {
  const currentPatientId = ref(null);

  function setCurrentPatient(id) {
    currentPatientId.value = id == null ? null : Number(id);
  }

  return { currentPatientId, setCurrentPatient };
});

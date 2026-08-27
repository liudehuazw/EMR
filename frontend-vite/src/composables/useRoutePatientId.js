import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { usePatientScope } from '@/stores/usePatientScope';

/**
 * Initialize active patient from route query ?patientId=
 * Also mirrors the selection into the global patientScope store (for the AI assistant).
 * @param {import('vue').Ref|Array|Function} patientsSource - patients array or getter
 */
export function useRoutePatientId(patientsSource) {
  const activePatientId = ref(null);
  const route = useRoute();
  const patientScope = usePatientScope();

  onMounted(() => {
    // 新页面挂载：先清空共享选中，避免上一页的选中残留
    patientScope.setCurrentPatient(null);
    const pid = route.query.patientId;
    if (!pid) return;
    const id = Number(pid);
    const patients = typeof patientsSource === 'function'
      ? patientsSource()
      : (patientsSource?.value ?? patientsSource);
    if (Array.isArray(patients) && patients.some((p) => p.id === id)) {
      activePatientId.value = id;
      patientScope.setCurrentPatient(id);
    }
  });

  return { activePatientId };
}

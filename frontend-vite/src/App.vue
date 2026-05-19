<template>
  <div id="app-root">
    <!-- 演示模式横幅 -->
    <div v-if="authStore.isDemoMode" class="demo-banner">
      ⚠️ 演示模式：所有操作不会保存，刷新页面后数据将清空
    </div>
    <!-- 顶部导航栏（登录后显示） -->
    <NavBar v-if="authStore.isLoggedIn" />
    <!-- 路由视图（带切换过渡动画） -->
    <router-view v-slot="{ Component, route }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.name" />
      </Transition>
    </router-view>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/useAuth';
import { usePatientsStore } from '@/stores/usePatients';
import { useLabStore } from '@/stores/useLab';
import { useImagingStore } from '@/stores/useImaging';
import { useInvoiceStore } from '@/stores/useInvoice';
import { useRecordsStore } from '@/stores/useRecords';
import NavBar from '@/components/NavBar.vue';

const authStore = useAuthStore();
const patientsStore = usePatientsStore();
const labStore = useLabStore();
const imagingStore = useImagingStore();
const invoiceStore = useInvoiceStore();
const recordsStore = useRecordsStore();

// On page refresh: if already logged in, verify token then reload all data from backend
// This prevents stale localStorage cache from accumulating duplicates
onMounted(async () => {
  if (!authStore.isLoggedIn || authStore.isDemoMode) return;
  try {
    // Verify token is still valid before loading data
    await patientsStore.loadFromBackend();
    // Token valid: load remaining data in background
    recordsStore.loadFromBackend(patientsStore.patients);
    labStore.loadFromBackend(patientsStore.patients);
    imagingStore.loadFromBackend(patientsStore.patients);
    invoiceStore.loadFromBackend(patientsStore.patients);
  } catch (e) {
    // Token expired or network error: authStore.logout() already called by apiRequest interceptor
    console.warn('[App] Refresh load failed, user logged out:', e.message);
  }
});
</script>

<style scoped>
/* ===== 路由切换淡入淡出 ===== */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.demo-banner {
  text-align: center;
  padding: 8px 16px;
  font-size: 14px;
  position: sticky;
  top: 0;
  z-index: 9999;
}
</style>

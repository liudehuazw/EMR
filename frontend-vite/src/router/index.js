import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/useAuth';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false, speed: 350, minimum: 0.2 });

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: '/patients'
  },
  {
    path: '/patients',
    name: 'Patients',
    component: () => import('@/views/PatientsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/patients/:id',
    name: 'PatientDetail',
    component: () => import('@/views/PatientDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/records',
    name: 'Records',
    component: () => import('@/views/RecordsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/lab',
    name: 'Lab',
    component: () => import('@/views/LabView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/imaging',
    name: 'Imaging',
    component: () => import('@/views/ImagingView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/invoice',
    name: 'Invoice',
    component: () => import('@/views/InvoiceView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/patients'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard: redirect to login if not authenticated
router.beforeEach((to) => {
  NProgress.start();
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    NProgress.done();
    return { name: 'Login' };
  }
  if (to.name === 'Login' && authStore.isLoggedIn) {
    NProgress.done();
    return { name: 'Patients' };
  }
});

router.afterEach(() => {
  NProgress.done();
});

export default router;

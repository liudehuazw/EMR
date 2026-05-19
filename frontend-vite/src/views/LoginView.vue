<template>
  <div class="login-container">

    <!-- 左侧：品牌展示区 -->
    <div class="login-brand">
      <div class="brand-inner">
        <div class="brand-logo">
          <AppIcon name="logo" :size="56" style="color:white;" />
        </div>
        <h1 class="brand-title">电子病历系统</h1>
        <p class="brand-subtitle">您的个人健康档案管家</p>
        <div class="brand-features">
          <div class="brand-feature">
            <span class="feature-icon">🔬</span>
            <span>智能检验报告解析，自动识别异常值</span>
          </div>
          <div class="brand-feature">
            <span class="feature-icon">🏥</span>
            <span>影像报告 AI 智能解读，通俗易懂</span>
          </div>
          <div class="brand-feature">
            <span class="feature-icon">📊</span>
            <span>历史数据趋势分析，健康可视化</span>
          </div>
          <div class="brand-feature">
            <span class="feature-icon">🔐</span>
            <span>多用户数据隔离，隐私安全有保障</span>
          </div>
        </div>
      </div>
      <div class="brand-footer">
        <span>© {{ new Date().getFullYear() }} 版权所有 赵文</span>
        <span class="footer-divider">|</span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">苏ICP备2025223659号</a>
      </div>
    </div>

    <!-- 右侧：登录表单区 -->
    <div class="login-form-panel">
      <div class="login-card">
        <div class="logo-area-mobile">
          <AppIcon name="logo" :size="36" style="color:var(--color-primary);" />
          <span style="font-weight:700; font-size:1.1rem; color:var(--color-primary)">电子病历系统</span>
        </div>
        <h2 class="form-title">欢迎登录</h2>
        <p class="form-subtitle">请输入您的账号和密码</p>

        <div class="form-group">
          <label>用户名</label>
          <div class="input-wrap">
            <span class="input-icon">👤</span>
            <input
              v-model="authStore.loginForm.username"
              type="text"
              placeholder="请输入用户名"
              @keyup.enter="handleLogin"
              autocomplete="username"
            />
          </div>
        </div>
        <div class="form-group">
          <label>密码</label>
          <div class="input-wrap">
            <span class="input-icon">🔒</span>
            <input
              v-model="authStore.loginForm.password"
              type="password"
              placeholder="请输入密码"
              @keyup.enter="handleLogin"
              autocomplete="current-password"
            />
          </div>
        </div>

        <div v-if="errorMsg" class="message error">{{ errorMsg }}</div>

        <button class="btn" @click="handleLogin" :disabled="authStore.loading">
          <span v-if="!authStore.loading">登 &nbsp;录</span>
          <span v-else class="btn-loading">
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
          </span>
        </button>

        <!-- 演示账户提示 -->
        <div class="demo-hint">
          <span class="demo-hint-icon">💡</span>
          <span>演示体验：用户名 <strong>user</strong> / 密码 <strong>user</strong>（数据不保存）</span>
        </div>
      </div>

      <!-- 移动端备案信息 -->
      <div class="login-footer-mobile">
        <span>© {{ new Date().getFullYear() }} 赵文</span>
        <span class="footer-divider">|</span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">苏ICP备2025223659号</a>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ===== 全局容器：左右分栏 ===== */
.login-container {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: stretch;
}

/* ===== 左侧品牌展示区 ===== */
.login-brand {
  flex: 1;
  background: linear-gradient(145deg, #0A2B5E 0%, #1251a3 55%, #1a6bc4 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 3rem 3.5rem;
  position: relative;
  overflow: hidden;
}
.login-brand::before {
  content: '';
  position: absolute;
  top: -100px; right: -80px;
  width: 420px; height: 420px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  pointer-events: none;
}
.login-brand::after {
  content: '';
  position: absolute;
  bottom: -80px; left: -60px;
  width: 300px; height: 300px;
  border-radius: 50%;
  background: rgba(255,255,255,0.03);
  pointer-events: none;
}
.brand-inner { position: relative; z-index: 1; }
.brand-logo {
  width: 80px; height: 80px;
  background: rgba(255,255,255,0.15);
  border-radius: 22px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 1.75rem;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.2);
}
.brand-title {
  font-size: 2rem;
  font-weight: 800;
  color: white;
  margin-bottom: 0.6rem;
  letter-spacing: 0.04em;
}
.brand-subtitle {
  font-size: 1rem;
  color: rgba(255,255,255,0.7);
  margin-bottom: 2.5rem;
  font-weight: 400;
}
.brand-features {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.brand-feature {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  color: rgba(255,255,255,0.88);
  font-size: 0.92rem;
  line-height: 1.5;
}
.feature-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
  width: 36px; height: 36px;
  background: rgba(255,255,255,0.12);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.brand-footer {
  position: relative; z-index: 1;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.brand-footer a { color: rgba(255,255,255,0.4); text-decoration: none; transition: color 0.2s; }
.brand-footer a:hover { color: rgba(255,255,255,0.75); }
.footer-divider { opacity: 0.4; }

/* ===== 右侧登录表单区 ===== */
.login-form-panel {
  width: 460px;
  flex-shrink: 0;
  background: #f0f3f8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 2rem;
  position: relative;
}
.login-card {
  width: 100%;
  max-width: 380px;
  padding: 2.5rem 2.25rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(10,43,94,0.13);
  border: 1px solid rgba(18,81,163,0.08);
}
/* 移动端才显示的Logo行 */
.logo-area-mobile {
  display: none;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin-bottom: 1.5rem;
}
.form-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 0.35rem;
}
.form-subtitle {
  font-size: 0.88rem;
  color: var(--color-text-sub);
  margin-bottom: 1.75rem;
}
/* 输入框带图标 */
.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon {
  position: absolute;
  left: 12px;
  font-size: 15px;
  pointer-events: none;
  z-index: 1;
}
.input-wrap input {
  padding-left: 2.4rem !important;
}
/* 登录按钮动画 */
.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.loading-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: white;
  animation: dot-bounce 1.2s infinite ease-in-out;
}
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}
/* 演示账户提示升级 */
.demo-hint {
  margin-top: 1.2rem;
  padding: 0.85rem 1rem;
  background: linear-gradient(135deg, #eff6ff, #e8f2ff);
  border-radius: 8px;
  font-size: 0.83rem;
  color: #1251a3;
  border: 1px solid #bfdbfe;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.5;
}
.demo-hint-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
/* 移动端备案 */
.login-footer-mobile {
  display: none;
  margin-top: 1.5rem;
  font-size: 0.75rem;
  color: var(--color-text-tip);
  gap: 0.5rem;
  align-items: center;
}
.login-footer-mobile a { color: var(--color-text-tip); text-decoration: none; }

/* ===== 响应式：小于1024px隐藏左侧 ===== */
@media (max-width: 1024px) {
  .login-brand { display: none; }
  .login-form-panel { width: 100%; background: linear-gradient(150deg, #0A2B5E 0%, #1251a3 45%, #1a6bc4 100%); }
  .login-card { box-shadow: 0 12px 48px rgba(10,43,94,0.25); }
  .logo-area-mobile { display: flex; }
  .form-title { text-align: center; }
  .form-subtitle { text-align: center; }
  .login-footer-mobile { display: flex; }
  .brand-footer { display: none; }
}
@media (max-width: 480px) {
  .login-form-panel { padding: 1.5rem 1rem; }
  .login-card { padding: 2rem 1.5rem; border-radius: 12px; }
  .form-title { font-size: 1.3rem; }
}
</style>

<script setup>
import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/useAuth';
import AppIcon from '@/components/AppIcon.vue';
import { usePatientsStore } from '@/stores/usePatients';
import { useLabStore } from '@/stores/useLab';
import { useImagingStore } from '@/stores/useImaging';
import { useInvoiceStore } from '@/stores/useInvoice';
import { useRecordsStore } from '@/stores/useRecords';

const router = useRouter();
const authStore = useAuthStore();
const patientsStore = usePatientsStore();
const labStore = useLabStore();
const imagingStore = useImagingStore();
const invoiceStore = useInvoiceStore();
const recordsStore = useRecordsStore();

const errorMsg = ref('');

const handleLogin = async () => {
  errorMsg.value = '';
  const result = await authStore.login(async (isDemo) => {
    // 【修复】先跳转页面，再后台异步加载数据，避免等待5秒
    await nextTick();
    router.replace({ name: 'Patients' });
    if (!isDemo) {
      // Real login: sync all data from backend in background
      patientsStore.loadFromBackend().then(() => {
        recordsStore.loadFromBackend(patientsStore.patients);
        labStore.loadFromBackend(patientsStore.patients);
        imagingStore.loadFromBackend(patientsStore.patients);
        invoiceStore.loadFromBackend(patientsStore.patients);
      });
    }
  });
  if (result?.error) {
    errorMsg.value = result.error;
  }
};
</script>

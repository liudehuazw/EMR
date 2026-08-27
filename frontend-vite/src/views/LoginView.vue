<template>
  <div class="login-container">

    <!-- 左侧：品牌展示区（蓝绿医疗主题） -->
    <div class="login-brand">
      <div class="brand-orbit orbit-one"></div>
      <div class="brand-orbit orbit-two"></div>
      <div class="brand-grid"></div>
      <div class="pulse-line" aria-hidden="true">
        <span></span>
        <span></span>
      </div>

      <div class="brand-inner">
        <div class="brand-eyebrow">Electronic Medical Record</div>
        <div class="brand-heading-row">
          <div class="brand-logo">
            <AppIcon name="logo" :size="58" style="color:white;" />
          </div>
          <div>
            <h1 class="brand-title">电子病历管理系统</h1>
            <p class="brand-subtitle">让每一次检查，都成为可追溯的健康记录</p>
          </div>
        </div>

        <p class="brand-description">
          整合所有零散医疗资料，统一归档病历、检验、影像、票据。<br>
          安全留存每一份健康记录，让家庭就医数据清晰可查、全程可溯。
        </p>

        <!-- 2x2 网格特性卡片 -->
        <div class="brand-features">
          <div class="brand-feature">
            <span class="feature-icon">🔬</span>
            <span>
              <strong>检验解析</strong>
              <em>自动识别异常值</em>
            </span>
          </div>
          <div class="brand-feature">
            <span class="feature-icon">🏥</span>
            <span>
              <strong>影像解读</strong>
              <em>AI 辅助说明</em>
            </span>
          </div>
          <div class="brand-feature">
            <span class="feature-icon">📊</span>
            <span>
              <strong>趋势分析</strong>
              <em>长期指标可视化</em>
            </span>
          </div>
          <div class="brand-feature">
            <span class="feature-icon">🔐</span>
            <span>
              <strong>隐私隔离</strong>
              <em>家庭成员分开管理</em>
            </span>
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
          <AppIcon name="logo" :size="36" style="color:var(--color-teal);" />
          <span style="font-weight:700; font-size:1.1rem; color:var(--color-teal)">电子病历系统</span>
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
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              @keyup.enter="handleLogin"
              autocomplete="current-password"
            />
            <button type="button" class="password-toggle" @click="showPassword = !showPassword" tabindex="-1">
              <span v-if="showPassword">👁️</span>
              <span v-else>👁️‍🗨️</span>
            </button>
          </div>
        </div>

        <!-- 记住登录状态 + 忘记密码 -->
        <div class="form-options">
          <label class="remember-me">
            <input type="checkbox" v-model="rememberMe" />
            <span>记住登录状态</span>
          </label>
          <a href="#" class="forgot-password" @click.prevent="handleForgotPassword">忘记密码?</a>
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

      <!-- 联系管理员开通账户 -->
      <div class="contact-admin">
        <span>没有账户？</span>
        <a href="#" @click.prevent="handleContactAdmin">联系管理员开通账户</a>
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
/* ==================================================
   登录页样式 - 蓝绿医疗主题
   参考设计：智慧医疗管理系统（蓝绿色系）
   融合 shadcn/ui 设计语言
   ================================================== */

/* ===== 全局容器：左右分栏 ===== */
.login-container {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: stretch;
}

/* ===== 左侧品牌展示区（蓝绿医疗主题） ===== */
.login-brand {
  flex: 1;
  background: var(--color-teal-gradient);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 3.2rem clamp(3rem, 6vw, 6.5rem);
  position: relative;
  overflow: hidden;
}
/* 装饰性半透明光晕 */
.login-brand::before {
  content: '';
  position: absolute;
  top: -150px; right: -120px;
  width: 520px; height: 520px;
  border-radius: 50%;
  background: oklch(1 0 0 / 0.06);
  pointer-events: none;
  animation: slow-float 14s ease-in-out infinite alternate;
}
.login-brand::after {
  content: '';
  position: absolute;
  bottom: -120px; left: -80px;
  width: 360px; height: 360px;
  border-radius: 50%;
  background: oklch(0.80 0.10 190 / 0.10);
  pointer-events: none;
  animation: slow-float 16s ease-in-out infinite alternate-reverse;
}
.brand-orbit {
  position: absolute;
  border: 1px solid oklch(1 0 0 / 0.12);
  border-radius: 999px;
  pointer-events: none;
}
.orbit-one {
  width: 620px;
  height: 620px;
  right: 10%;
  top: 50%;
  transform: translateY(-50%);
  animation: orbit-breathe 10s ease-in-out infinite;
}
.orbit-two {
  width: 360px;
  height: 360px;
  right: 27%;
  top: 50%;
  transform: translateY(-50%);
  border-color: oklch(0.80 0.10 190 / 0.12);
  animation: orbit-breathe 12s ease-in-out infinite reverse;
}
.brand-grid {
  position: absolute;
  inset: 0;
  opacity: 0.12;
  background-image:
    linear-gradient(oklch(1 0 0 / 0.08) 1px, transparent 1px),
    linear-gradient(90deg, oklch(1 0 0 / 0.08) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(90deg, transparent 0%, black 20%, black 74%, transparent 100%);
}
.pulse-line {
  position: absolute;
  right: 9%;
  bottom: 20%;
  width: 360px;
  height: 88px;
  opacity: 0.28;
  pointer-events: none;
}
.pulse-line span {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent 0 8%, oklch(1 0 0 / 0.30) 8% 9%, transparent 9% 18%, oklch(1 0 0 / 0.35) 18% 19%, transparent 19% 28%, oklch(1 0 0 / 0.55) 28% 29%, transparent 29% 38%, oklch(1 0 0 / 0.28) 38% 39%, transparent 39% 100%);
  clip-path: polygon(0 55%, 12% 55%, 18% 38%, 23% 72%, 30% 20%, 36% 55%, 52% 55%, 58% 42%, 64% 65%, 72% 55%, 100% 55%, 100% 57%, 72% 57%, 64% 67%, 58% 44%, 52% 57%, 36% 57%, 30% 24%, 23% 74%, 18% 40%, 12% 57%, 0 57%);
  animation: pulse-slide 6s linear infinite;
}
.pulse-line span:nth-child(2) {
  opacity: 0.25;
  animation-delay: -3s;
}
.brand-inner {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: auto 0;
  animation: hero-enter 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.brand-eyebrow {
  color: oklch(0.90 0.05 180 / 0.80);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin-bottom: 1.35rem;
}
.brand-heading-row {
  display: flex;
  align-items: center;
  gap: 1.35rem;
}
.brand-logo {
  width: 88px; height: 88px;
  background: linear-gradient(145deg, oklch(1 0 0 / 0.20), oklch(1 0 0 / 0.06));
  border-radius: 26px;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(12px);
  border: 1px solid oklch(1 0 0 / 0.22);
  box-shadow: 0 24px 60px oklch(0 0 0 / 0.20), inset 0 1px 0 oklch(1 0 0 / 0.20);
  flex-shrink: 0;
  animation: logo-glow 3.8s ease-in-out infinite alternate;
}
.brand-title {
  font-size: clamp(2.65rem, 4.25vw, 4.6rem);
  line-height: 0.95;
  font-weight: 800;
  color: white;
  margin-bottom: 0.85rem;
  letter-spacing: -0.03em;
  text-shadow: 0 16px 40px oklch(0 0 0 / 0.24);
}
.brand-subtitle {
  font-size: clamp(1.08rem, 1.35vw, 1.35rem);
  color: oklch(1 0 0 / 0.82);
  font-weight: 600;
}
.brand-description {
  max-width: 690px;
  margin: 2rem 0 2.3rem;
  color: oklch(0.92 0.03 180 / 0.78);
  font-size: clamp(1rem, 1.08vw, 1.1rem);
  line-height: 1.9;
}
/* 2x2 网格特性卡片 */
.brand-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 680px;
  gap: 0.85rem;
}
.brand-feature {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  color: oklch(1 0 0 / 0.88);
  font-size: 0.88rem;
  line-height: 1.4;
  padding: 0.9rem 0.95rem;
  border-radius: 14px;
  background: oklch(1 0 0 / 0.08);
  border: 1px solid oklch(1 0 0 / 0.12);
  box-shadow: 0 10px 24px oklch(0.04 0.04 180 / 0.14);
  backdrop-filter: blur(12px);
  animation: feature-enter 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease;
}
.brand-feature:nth-child(1) { animation-delay: 0.12s; }
.brand-feature:nth-child(2) { animation-delay: 0.2s; }
.brand-feature:nth-child(3) { animation-delay: 0.28s; }
.brand-feature:nth-child(4) { animation-delay: 0.36s; }
.brand-feature:hover {
  transform: translateY(-4px);
  background: oklch(1 0 0 / 0.13);
  border-color: oklch(1 0 0 / 0.26);
}
.feature-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  width: 40px; height: 40px;
  background: oklch(1 0 0 / 0.13);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.brand-feature strong {
  display: block;
  font-size: 0.95rem;
  margin-bottom: 0.1rem;
}
.brand-feature em {
  display: block;
  color: oklch(0.90 0.04 180 / 0.72);
  font-style: normal;
  font-size: 0.80rem;
}
.brand-footer {
  position: relative; z-index: 1;
  font-size: 0.78rem;
  color: oklch(1 0 0 / 0.38);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.brand-footer a { color: oklch(1 0 0 / 0.38); text-decoration: none; transition: color 0.2s; }
.brand-footer a:hover { color: oklch(1 0 0 / 0.72); }
.footer-divider { opacity: 0.4; }

/* ===== 右侧登录表单区 ===== */
.login-form-panel {
  width: 460px;
  flex-shrink: 0;
  background: var(--background);
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
  background: var(--card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
  animation: card-enter 0.7s 0.12s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.login-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-xl);
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
  color: var(--foreground);
  margin-bottom: 0.35rem;
}
.form-subtitle {
  font-size: 0.88rem;
  color: var(--muted-foreground);
  margin-bottom: 1.75rem;
}
/* 输入框 */
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
  padding-right: 2.6rem !important;
}
/* 密码显示/隐藏切换按钮 */
.password-toggle {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  padding: 6px;
  line-height: 1;
  opacity: 0.5;
  transition: opacity 0.2s;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.password-toggle:hover {
  opacity: 0.85;
}
/* 蓝绿主题的 focus 环 */
.form-group input:focus {
  outline: none;
  border-color: var(--color-teal);
  box-shadow: 0 0 0 3px oklch(0.55 0.10 190 / 0.20);
  background: #fff;
}

/* 记住登录状态 + 忘记密码 */
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0.85rem 0 1.1rem;
}
.remember-me {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--muted-foreground);
  cursor: pointer;
  user-select: none;
}
.remember-me input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: var(--color-teal);
  cursor: pointer;
  margin: 0;
}
.forgot-password {
  font-size: 0.85rem;
  color: var(--color-teal);
  text-decoration: none;
  transition: opacity 0.2s;
}
.forgot-password:hover {
  opacity: 0.75;
  text-decoration: underline;
}

/* 蓝绿主题的登录按钮 */
.btn {
  position: relative;
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--color-teal);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px oklch(0 0 0 / 0.12);
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn:hover {
  background: var(--color-teal-dark);
  box-shadow: 0 4px 12px oklch(0.15 0.08 190 / 0.25);
}
.btn:active {
  transform: scale(0.98);
}
.btn:disabled {
  background: var(--muted);
  color: var(--muted-foreground);
  box-shadow: none;
  cursor: not-allowed;
}
/* 登录按钮加载动画 */
.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.loading-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: white;
  animation: dot-bounce 1.2s infinite ease-in-out;
}
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
/* 演示账户提示 - 蓝绿主题 */
.demo-hint {
  margin-top: 1.2rem;
  padding: 0.85rem 1rem;
  background: oklch(0.90 0.05 180 / 0.15);
  border-radius: var(--radius-md);
  font-size: 0.83rem;
  color: var(--color-teal);
  border: 1px solid oklch(0.65 0.10 190 / 0.25);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.5;
}
.demo-hint-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }

/* 联系管理员开通账户 */
.contact-admin {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.83rem;
  color: var(--muted-foreground);
}
.contact-admin a {
  color: var(--color-teal);
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}
.contact-admin a:hover {
  opacity: 0.75;
  text-decoration: underline;
}

/* 移动端备案 */
.login-footer-mobile {
  display: none;
  margin-top: 1.5rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  gap: 0.5rem;
  align-items: center;
}
.login-footer-mobile a { color: var(--muted-foreground); text-decoration: none; }

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .login-brand { display: none; }
  .login-form-panel { width: 100%; background: var(--color-teal-gradient); }
  .login-card { box-shadow: 0 12px 48px oklch(0.06 0.06 180 / 0.22); }
  .logo-area-mobile { display: flex; }
  .form-title { text-align: center; color: white; }
  .form-subtitle { text-align: center; color: oklch(1 0 0 / 0.72); }
  .login-footer-mobile { display: flex; color: oklch(1 0 0 / 0.50); }
  .login-footer-mobile a { color: oklch(1 0 0 / 0.50); }
  .brand-footer { display: none; }
}
@media (max-width: 1280px) {
  .login-brand { padding-inline: 3.2rem; }
  .brand-heading-row { align-items: flex-start; flex-direction: column; gap: 1.1rem; }
  .brand-title { font-size: clamp(2.8rem, 5.8vw, 4.2rem); }
  .pulse-line { right: 4%; width: 300px; }
}
@media (max-width: 480px) {
  .login-form-panel { padding: 1.5rem 1rem; }
  .login-card { padding: 2rem 1.5rem; border-radius: var(--radius-lg); }
  .form-title { font-size: 1.3rem; }
}

/* ===== 关键帧动画 ===== */
@keyframes hero-enter {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes feature-enter {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes card-enter {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes slow-float {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(-28px, 22px, 0) scale(1.06); }
}
@keyframes orbit-breathe {
  0%, 100% { opacity: 0.40; transform: translateY(-50%) scale(1); }
  50% { opacity: 0.70; transform: translateY(-50%) scale(1.045); }
}
@keyframes logo-glow {
  from { box-shadow: 0 22px 54px oklch(0 0 0 / 0.18), 0 0 0 oklch(0.76 0.13 230 / 0); }
  to { box-shadow: 0 26px 68px oklch(0 0 0 / 0.22), 0 0 36px oklch(0.76 0.13 230 / 0.26); }
}
@keyframes pulse-slide {
  from { transform: translateX(-18px); opacity: 0.12; }
  25%, 70% { opacity: 0.50; }
  to { transform: translateX(24px); opacity: 0.10; }
}

@media (prefers-reduced-motion: reduce) {
  .login-brand::before,
  .login-brand::after,
  .brand-orbit,
  .brand-logo,
  .pulse-line span,
  .brand-inner,
  .brand-feature,
  .login-card {
    animation: none;
  }
}
</style>

<script setup>
import { ref, nextTick, onMounted } from 'vue';
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
const showPassword = ref(false);
const rememberMe = ref(false);

// 恢复记住的登录状态
onMounted(() => {
  const saved = localStorage.getItem('emr_remember_me');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.username) {
        authStore.loginForm.username = data.username;
        rememberMe.value = true;
      }
    } catch (e) { /* ignore */ }
  }
});

const handleLogin = async () => {
  errorMsg.value = '';
  // 记住登录状态
  if (rememberMe.value) {
    localStorage.setItem('emr_remember_me', JSON.stringify({
      username: authStore.loginForm.username
    }));
  } else {
    localStorage.removeItem('emr_remember_me');
  }

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

const handleForgotPassword = () => {
  // 忘记密码功能 - 可以后续对接后端
  alert('请联系管理员重置密码');
};

const handleContactAdmin = () => {
  // 联系管理员开通账户
  alert('请联系管理员开通账户\n管理员：赵文');
};
</script>

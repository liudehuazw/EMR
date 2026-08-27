<template>
  <div class="navbar-wrapper">
    <div class="navbar-modules">
      <el-button
        v-for="item in mainMenuItems"
        :key="item.index"
        :color="item.color"
        :plain="isMenuActive(item.index)"
        dark
        class="nav-module-btn"
        :class="item.class"
        @click="goTo(item.index)"
      >
        <AppIcon :name="item.icon" :size="17" class="nav-icon" />
        {{ item.label }}
      </el-button>
    </div>

    <div class="navbar-user">
      <el-button
        :color="invoiceMenuItem.color"
        :plain="isMenuActive(invoiceMenuItem.index)"
        dark
        class="nav-module-btn nav-module-btn--mobile-invoice"
        @click="goTo(invoiceMenuItem.index)"
      >
        <AppIcon name="invoice" :size="17" class="nav-icon" />
        {{ invoiceMenuItem.label }}
      </el-button>

      <span class="navbar-username">
        <AppIcon name="user" :size="16" />
        {{ authStore.userInfo?.realName || '用户' }}
      </span>
      <el-button
        v-if="!authStore.isDemoMode"
        class="navbar-action-btn"
        @click="showChangePwd = true"
      >
        <AppIcon name="password" :size="15" class="action-icon" />
        修改密码
      </el-button>
      <el-button class="navbar-action-btn navbar-logout-btn" @click="authStore.logout()">
        <AppIcon name="logout" :size="16" class="action-icon" />
        退出
      </el-button>
    </div>
  </div>

  <el-dialog v-model="showChangePwd" title="修改密码" width="400px">
    <el-form :model="pwdForm" label-width="80px">
      <el-form-item label="原密码">
        <el-input v-model="pwdForm.oldPwd" type="password" show-password />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="pwdForm.newPwd" type="password" show-password />
      </el-form-item>
      <el-form-item label="确认密码">
        <el-input v-model="pwdForm.confirmPwd" type="password" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showChangePwd = false">取消</el-button>
      <el-button type="primary" @click="doChangePwd" :loading="pwdLoading">确认修改</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/useAuth';
import { ElMessage } from 'element-plus';
import AppIcon from '@/components/AppIcon.vue';
import { useThemeTuner } from '@/composables/useThemeTuner';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { getValue } = useThemeTuner();

const showChangePwd = ref(false);
const pwdLoading = ref(false);
const pwdForm = reactive({ oldPwd: '', newPwd: '', confirmPwd: '' });

const mainMenuItems = computed(() => [
  { index: '/patients', label: '患者档案', icon: 'patients', color: getValue('--color-patients', '#2563a8') },
  { index: '/records', label: '病历统计', icon: 'records', color: getValue('--color-records', '#d97706') },
  { index: '/lab', label: '检验报告', icon: 'lab', color: getValue('--color-lab', '#6eb329') },
  { index: '/imaging', label: '影像报告', icon: 'imaging', color: getValue('--color-imaging', '#6d4ec2') },
  { index: '/invoice', label: '发票统计', icon: 'invoice', color: getValue('--color-invoice', '#c0392b'), class: 'nav-module-btn--desktop-invoice' }
]);

const invoiceMenuItem = computed(() => mainMenuItems.value[4]);

const activeMenuPath = computed(() => route.meta?.activeMenu || route.path);

const isMenuActive = (index) => activeMenuPath.value === index;

const goTo = (path) => {
  if (route.path !== path) router.push(path);
};

const doChangePwd = async () => {
  if (!pwdForm.oldPwd || !pwdForm.newPwd) {
    ElMessage.warning('请填写完整密码信息');
    return;
  }
  if (pwdForm.newPwd !== pwdForm.confirmPwd) {
    ElMessage.error('两次输入的新密码不一致');
    return;
  }
  pwdLoading.value = true;
  try {
    await authStore.changePassword(pwdForm.oldPwd, pwdForm.newPwd);
    ElMessage.success('密码修改成功，请重新登录');
    showChangePwd.value = false;
    authStore.logout();
  } catch (e) {
    ElMessage.error(e.message || '修改失败');
  } finally {
    pwdLoading.value = false;
  }
};
</script>

<style scoped>
.navbar-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 2rem;
  padding-top: calc(0.65rem + env(safe-area-inset-top));
  padding-top: calc(0.65rem + constant(safe-area-inset-top));
  background: linear-gradient(135deg, #0A2B5E 0%, #1251a3 60%, #1a6bc4 100%);
  box-shadow: 0 3px 12px rgba(10, 43, 94, 0.28);
  gap: 1rem;
  flex-wrap: nowrap;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-modules {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.navbar-modules::-webkit-scrollbar {
  display: none;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  white-space: nowrap;
}

.navbar-modules :deep(.el-button),
.navbar-user :deep(.el-button) {
  min-height: 32px;
  min-width: auto;
  height: 32px;
  margin: 0;
  align-self: center;
}

.navbar-user :deep(.el-button) {
  padding: 0 12px;
}

.navbar-username {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.88rem;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  line-height: 32px;
  padding: 0 0.65rem;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  flex-shrink: 0;
}

.nav-icon {
  margin-right: 5px;
  vertical-align: -2px;
}

.action-icon {
  margin-right: 4px;
  vertical-align: -2px;
}

/* 模块按钮：未按下 Default（实心），按下 Plain（描边）；文字始终白色 */
.nav-module-btn {
  flex-shrink: 0;
  font-size: 0.88rem;
  font-weight: 500;
}

.navbar-modules :deep(.nav-module-btn.el-button),
.navbar-user :deep(.nav-module-btn.el-button) {
  --el-button-text-color: #fff;
  --el-button-hover-text-color: #fff;
  --el-button-active-text-color: #fff;
  color: #fff !important;
}

.navbar-modules :deep(.nav-module-btn.el-button:hover),
.navbar-modules :deep(.nav-module-btn.el-button:focus),
.navbar-modules :deep(.nav-module-btn.el-button:active),
.navbar-user :deep(.nav-module-btn.el-button:hover),
.navbar-user :deep(.nav-module-btn.el-button:focus),
.navbar-user :deep(.nav-module-btn.el-button:active) {
  color: #fff !important;
}

.navbar-modules :deep(.nav-module-btn .nav-icon),
.navbar-user :deep(.nav-module-btn .nav-icon) {
  color: #fff;
}

/* 选中 plain：透明底 + 主题色描边，文字保持白色 */
.navbar-modules :deep(.nav-module-btn.is-plain),
.navbar-user :deep(.nav-module-btn.is-plain) {
  background-color: transparent !important;
}

.nav-module-btn--mobile-invoice {
  display: none;
}

/* 右上角操作按钮：半透明底 + 白字（避免 text/bg 导致白底白字） */
.navbar-user :deep(.navbar-action-btn.el-button) {
  color: #fff !important;
  background-color: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.38) !important;
  font-size: 0.85rem;
}

.navbar-user :deep(.navbar-action-btn.el-button:hover),
.navbar-user :deep(.navbar-action-btn.el-button:focus) {
  color: #fff !important;
  background-color: rgba(255, 255, 255, 0.26) !important;
  border-color: rgba(255, 255, 255, 0.55) !important;
}

.navbar-user :deep(.navbar-logout-btn.el-button:hover),
.navbar-user :deep(.navbar-logout-btn.el-button:focus) {
  color: #fff !important;
  background-color: rgba(220, 60, 60, 0.55) !important;
  border-color: rgba(255, 120, 120, 0.7) !important;
}

@media (max-width: 640px) {
  .navbar-wrapper {
    flex-direction: column;
    align-items: stretch;
    padding: 0.55rem 0.9rem;
    gap: 0.45rem;
  }

  .navbar-modules {
    order: 1;
    gap: 6px;
  }

  .nav-module-btn {
    font-size: 0.78rem;
    padding: 8px 10px;
  }

  .nav-icon {
    display: none;
  }

  .nav-module-btn--desktop-invoice {
    display: none;
  }

  .nav-module-btn--mobile-invoice {
    display: inline-flex;
    margin-right: auto;
  }

  .navbar-user {
    order: 2;
    justify-content: flex-end;
    gap: 6px;
  }

  .navbar-user :deep(.el-button) {
    min-height: 36px;
    height: 36px;
    padding: 0 10px;
  }

  .navbar-username {
    height: 36px;
    line-height: 36px;
    font-size: 0.82rem;
  }

  .navbar-user :deep(.navbar-action-btn.el-button) {
    font-size: 0.78rem;
  }
}

@media (max-width: 400px) {
  .nav-module-btn {
    font-size: 0.72rem;
    padding: 8px;
  }

  .navbar-username {
    display: none;
  }
}
</style>

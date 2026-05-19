<template>
  <div class="navbar-wrapper">
    <!-- 第一行：功能模块按钮（横向可滚动） -->
    <div class="navbar-modules">
      <button @click="go('patients')" class="nav-btn nav-patients" :class="{ 'nav-active': isActive('Patients') }"><AppIcon name="patients" :size="17" class="nav-icon" /> 患者档案</button>
      <button @click="go('records')"  class="nav-btn nav-records"  :class="{ 'nav-active': isActive('Records') }"><AppIcon name="records" :size="17" class="nav-icon" /> 病历统计</button>
      <button @click="go('lab')"      class="nav-btn nav-lab"      :class="{ 'nav-active': isActive('Lab') }"><AppIcon name="lab" :size="17" class="nav-icon" /> 检验报告</button>
      <button @click="go('imaging')"  class="nav-btn nav-imaging"  :class="{ 'nav-active': isActive('Imaging') }"><AppIcon name="imaging" :size="17" class="nav-icon" /> 影像报告</button>
      <button @click="go('invoice')"  class="nav-btn nav-invoice"  :class="{ 'nav-active': isActive('Invoice') }"><AppIcon name="invoice" :size="17" class="nav-icon" /> 发票统计</button>
    </div>
    <!-- 第二行：用户信息 + 操作（仅手机端显示第二行，桌面端合并一行） -->
    <div class="navbar-user">
      <span class="navbar-username">
        <AppIcon name="user" :size="16" /> {{ authStore.userInfo?.realName || '用户' }}
      </span>
      <button v-if="!authStore.isDemoMode" @click="showChangePwd = true" class="change-pwd-btn">
        <AppIcon name="password" :size="15" style="margin-right:4px;" />修改密码
      </button>
      <button @click="authStore.logout()" class="nav-btn logout-btn"><AppIcon name="logout" :size="16" style="margin-right:4px;" />退出</button>
    </div>
  </div>

  <!-- 修改密码弹窗 -->
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
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/useAuth';
import { ElMessage } from 'element-plus';
import AppIcon from '@/components/AppIcon.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const showChangePwd = ref(false);
const pwdLoading = ref(false);
const pwdForm = reactive({ oldPwd: '', newPwd: '', confirmPwd: '' });

const go = (name) => router.push({ name: name.charAt(0).toUpperCase() + name.slice(1) });
const isActive = (name) => route.name === name;

// Mobile: user row is shown below modules row; Desktop: single flex row
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
/* ===== 桌面端：单行布局 ===== */
.navbar-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 2rem;
  padding-top: calc(0.65rem + env(safe-area-inset-top));
  padding-top: calc(0.65rem + constant(safe-area-inset-top));
  /* 深蓝渐变导航栏 */
  background: linear-gradient(135deg, #0A2B5E 0%, #1251a3 60%, #1a6bc4 100%);
  border-bottom: none;
  box-shadow: 0 3px 12px rgba(10,43,94,0.28);
  gap: 1rem;
  flex-wrap: nowrap;
  position: sticky;
  top: 0;
  z-index: 100;
}
.navbar-modules {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 1;
  min-width: 0;
}
.navbar-modules::-webkit-scrollbar { display: none; }
.navbar-user {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  white-space: nowrap;
}
.navbar-username {
  color: rgba(255,255,255,0.85);
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  padding: 0.3rem 0.5rem;
  background: rgba(255,255,255,0.1);
  border-radius: 20px;
}
.nav-icon { margin-right: 5px; }

/* ===== 当前页高亮 ===== */
.nav-active {
  background: rgba(255, 255, 255, 0.22) !important;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.55), 0 3px 10px rgba(0,0,0,0.18) !important;
  font-weight: 700 !important;
  transform: translateY(-1px);
}
.nav-active::after {
  content: '';
  position: absolute;
  bottom: -2px; left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: rgba(255,255,255,0.9);
  border-radius: 2px;
}
.nav-btn { position: relative; }

/* ===== 手机端：两行布局（≤640px） ===== */
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
    padding-bottom: 2px;
  }
  .navbar-modules .nav-btn {
    padding: 0.45rem 0.65rem !important;
    font-size: 0.78rem !important;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .nav-icon { display: none; } /* 小屏隐藏图标，只显示文字 */
  .navbar-user {
    order: 2;
    justify-content: flex-end;
    gap: 6px;
  }
  .navbar-username { font-size: 0.82rem; }
  .change-pwd-btn {
    padding: 0.35rem 0.6rem !important;
    font-size: 0.78rem !important;
  }
  .logout-btn {
    padding: 0.35rem 0.6rem !important;
    font-size: 0.78rem !important;
  }
}

/* ===== 超小屏（≤400px） ===== */
@media (max-width: 400px) {
  .navbar-modules .nav-btn { font-size: 0.72rem !important; padding: 0.4rem 0.5rem !important; }
  .navbar-username { display: none; } /* 极小屏隐藏用户名，只留操作按钮 */
}
</style>

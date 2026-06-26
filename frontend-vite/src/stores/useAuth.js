import { defineStore } from 'pinia';
import { ref } from 'vue';
import { API_BASE_URL } from '@/api/index';
import router from '@/router';

export const useAuthStore = defineStore('auth', () => {
  // Demo mode: user/user account, no data persistence
  const isDemoMode = ref(false);

  // Restore login state (demo user is always cleared on refresh)
  const _loadLoginState = () => {
    const token = localStorage.getItem('emr_token');
    const userInfo = localStorage.getItem('emr_user_info');
    if (!token || !userInfo) return null;
    const info = JSON.parse(userInfo);
    if (info.username === 'user') {
      localStorage.removeItem('emr_token');
      localStorage.removeItem('emr_user_info');
      return null;
    }
    return info;
  };

  const isLoggedIn = ref(!!_loadLoginState());
  const userInfo = ref(_loadLoginState());
  const loading = ref(false);

  const loginForm = ref({
    username: '',
    password: ''
  });

  /**
   * Login: demo mode or real backend JWT
   * @param {Function} onSuccess - called after login, receives isDemoMode
   */
  const login = async (onSuccess) => {
    if (!loginForm.value.username || !loginForm.value.password) {
      return { error: '请输入用户名和密码' };
    }

    const isDemoAccount = loginForm.value.username === 'user' && loginForm.value.password === 'user';
    loading.value = true;

    try {
      if (isDemoAccount) {
        isDemoMode.value = true;
        // Clear all localStorage caches so demo starts empty
        ['emr_patients', 'emr_medical_records', 'emr_lab_reports',
          'emr_imaging_reports', 'emr_invoices', 'emr_current_view', 'emr_current_patient']
          .forEach(k => localStorage.removeItem(k));

        const info = {
          token: 'demo_token', userId: 999,
          username: 'user', realName: '演示用户',
          loginTime: new Date().toISOString()
        };
        localStorage.setItem('emr_token', info.token);
        localStorage.setItem('emr_user_info', JSON.stringify(info));
        userInfo.value = info;
        isLoggedIn.value = true;
        onSuccess && await onSuccess(true);
        return { success: true };
      }

      // Real backend login
      const result = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.value.username,
          password: loginForm.value.password
        })
      });
      const data = await result.json();
      if (data.code !== 200) {
        return { error: data.message || '用户名或密码错误' };
      }

      isDemoMode.value = false;
      const loginData = data.data;
      const info = {
        token: loginData.token,
        userId: loginData.userId,
        username: loginData.username,
        realName: loginData.realName,
        loginTime: new Date().toISOString()
      };
      localStorage.setItem('emr_token', loginData.token);
      localStorage.setItem('emr_user_info', JSON.stringify(info));
      localStorage.removeItem('emr_current_view');
      userInfo.value = info;
      isLoggedIn.value = true;
      onSuccess && await onSuccess(false);
      return { success: true };
    } catch (err) {
      console.error('[Auth] Login failed:', err);
      return { error: '登录失败，请重试' };
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    localStorage.removeItem('emr_token');
    localStorage.removeItem('emr_user_info');
    localStorage.removeItem('emr_current_view');
    isLoggedIn.value = false;
    isDemoMode.value = false;
    userInfo.value = null;
    router.push({ name: 'Login' });
  };

  /**
   * Change password via backend API
   * @param {string} oldPwd
   * @param {string} newPwd
   */
  const changePassword = async (oldPwd, newPwd) => {
    const token = localStorage.getItem('emr_token');
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
    });
    const data = await response.json();
    if (data.code !== 200) throw new Error(data.message || '修改失败');
    return true;
  };

  return {
    isDemoMode, isLoggedIn, userInfo, loading, loginForm,
    login, logout, changePassword
  };
});

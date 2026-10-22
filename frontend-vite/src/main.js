import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import './assets/main.css';

import { initThemeTuner } from '@/composables/useThemeTuner';
import App from './App.vue';
import router from './router';

initThemeTuner();

const app = createApp(App);
const pinia = createPinia();

// 说明：原先此处用 `import * as ElementPlusIconsVue` 全量注册了约 290 个图标组件。
// 但全项目模板中并未使用任何 <el-icon>/图标组件（图标均来自 AppIcon.vue 或 emoji），
// 全量注册只增加首屏体积。Element Plus 组件内部所需的图标由其自身按需引入，不受影响。
// 如后续确实需要某个图标，请按需单独引入：import { Search } from '@element-plus/icons-vue'

app.use(pinia);
app.use(router);
app.use(ElementPlus, { locale: zhCn });

app.mount('#app');

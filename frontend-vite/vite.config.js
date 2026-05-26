import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  css: {
    postcss: {
      plugins: [
        autoprefixer({
          overrideBrowserslist: [
            '> 0.2%',
            'last 2 versions',
            'not dead',
            'iOS >= 12',
            'Android >= 7'
          ]
        })
      ]
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-element': ['element-plus']
        }
      }
      external: ['/pic/AIGLM.png'],
      onwarn(warning, warn) {
        // 只忽略特定的图片导入错误，其他警告正常显示
        if (
          warning.code === 'UNRESOLVED_IMPORT' &&
          warning.source === '/pic/AIGLM.png'
        ) {
          return; // 跳过这个警告，不终止构建
        }
        warn(warning); // 其他警告正常处理
    }
  }
});

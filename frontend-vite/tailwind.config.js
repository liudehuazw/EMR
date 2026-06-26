/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {}
  },
  plugins: [],
  // Element Plus 优先级保护：Tailwind base 不覆盖 EP 样式
  corePlugins: {
    preflight: false
  }
};

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages 项目页挂在 /housing-compare/ 下
export default defineConfig({
  base: '/housing-compare/',
  plugins: [react(), tailwindcss()],
  // recharts 占了大头，单页工具不拆包也可以接受
  build: { chunkSizeWarningLimit: 700 },
});

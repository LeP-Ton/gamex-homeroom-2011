import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 使用相对资源路径，让本地预览与 GitHub Pages 仓库子目录共享同一份构建。
  base: './',
  build: { assetsInlineLimit: 0 },
  plugins: [react()],
  test: { environment: 'node' },
});

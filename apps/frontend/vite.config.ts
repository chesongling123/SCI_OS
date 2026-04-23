import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 手动拆包策略：将第三方库按类别拆分，提升缓存命中率
        manualChunks: {
          // React 核心运行时
          'vendor-react': ['react', 'react-dom'],
          // 路由 + 状态管理
          'vendor-router': ['react-router-dom', 'zustand', '@tanstack/react-query'],
          // UI 图标
          'vendor-icons': ['lucide-react'],
          // 大型第三方库（按需拆分）
          'vendor-calendar': ['@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
    // 提高 chunk 体积告警阈值（拆包后预期会改善）
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});

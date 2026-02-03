import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // 开发服务器配置
  server: {
    port: 5173,
    host: '127.0.0.1',
    open: false,
    // 代理后端API请求
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },

  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 生成source map便于调试
    sourcemap: true,
    // 代码分割
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        experimental: path.resolve(__dirname, 'experimental.html')
      },
      output: {
        manualChunks: {
          // 将核心模块打包在一起
          'core': [
            './frontend/js/core/storage-manager.js',
            './frontend/js/core/state-validator.js'
          ],
          // 将工具函数打包在一起
          'utils': [
            './frontend/js/utils/error-handler.js',
            './frontend/js/utils/global-bridges.js'
          ]
        }
      }
    }
  },

  // 路径别名（可选，方便导入）
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend'),
      '@exp': path.resolve(__dirname, './frontend/experimental-src'),
      '@modules': path.resolve(__dirname, './frontend/js/modules'),
      '@utils': path.resolve(__dirname, './frontend/js/utils'),
      '@core': path.resolve(__dirname, './frontend/js/core')
    }
  },

  // 优化配置
  optimizeDeps: {
    // 预构建依赖
    include: []
  },

  // 保持全局变量可用
  define: {
    // 确保全局变量在开发和生产环境都可用
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  },
  server: {
    proxy: {
      // Проксируем все запросы к внешнему API, чтобы обойти CORS в dev-режиме
      '/schedule': {
        target: 'https://api.myimsit.ru/schedule',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/schedule/, ''),
      },
    },
  },
})

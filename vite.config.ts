import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Проксируем все запросы к внешнему API, чтобы обойти CORS в dev-режиме
      '/schedule': {
        target: 'https://rapi.imsit.ru/schedule',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/schedule/, ''),
      },
    },
  },
})

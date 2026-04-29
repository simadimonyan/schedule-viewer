import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Подхватываем VITE_* из .env, чтобы править только его.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  const apiBaseUrlRaw = env.VITE_API_BASE_URL
  if (!apiBaseUrlRaw || typeof apiBaseUrlRaw !== 'string' || !apiBaseUrlRaw.trim()) {
    throw new Error('Missing required env var: VITE_API_BASE_URL')
  }

  const apiBaseUrl = apiBaseUrlRaw.replace(/\/+$/, '')

  const isDev = mode === 'development'

  // Префикс (pathname) который будет проксироваться в dev.
  // Например: https://host/schedule -> `/schedule`
  const proxyPrefix = (() => {
    if (!isDev) return null
    if (!/^https?:\/\//i.test(apiBaseUrl)) {
      throw new Error('DEV mode requires absolute VITE_API_BASE_URL (including protocol)')
    }
    const pathname = new URL(apiBaseUrl).pathname.replace(/\/+$/, '')
    if (!pathname) throw new Error(`Invalid VITE_API_BASE_URL (empty pathname): ${apiBaseUrl}`)
    return pathname
  })()

  const escapedPrefix = proxyPrefix ? proxyPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : ''

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    },
    server: {
      proxy: proxyPrefix
        ? {
            // Проксируем запросы к внешнему API, чтобы обойти CORS в dev-режиме.
            [proxyPrefix]: {
              target: apiBaseUrl,
              changeOrigin: true,
              secure: false,
              // SSE-friendly: снимаем таймауты, иначе http-proxy через ~60s
              // закрывает соединение с 504, не дождавшись первого
              // Flux.interval(Duration.ofMinutes(1)) события от backend'а.
              timeout: 0,
              proxyTimeout: 0,
              configure: (proxy) => {
                // Для SSE-запросов отключаем буферизацию и заставляем
                // upstream отдавать chunks сразу. Дополнительно явно
                // переписываем Accept-Encoding на identity, чтобы прокси
                // не сжимал поток (gzip ломает realtime SSE).
                proxy.on('proxyReq', (proxyReq, req) => {
                  if (req.url && req.url.includes('/online/sse')) {
                    proxyReq.setHeader('Accept-Encoding', 'identity')
                    proxyReq.setHeader('Connection', 'keep-alive')
                  }
                })
                proxy.on('proxyRes', (proxyRes, req) => {
                  if (req.url && req.url.includes('/online/sse')) {
                    // Гарантируем что клиент получит правильный
                    // Content-Type, даже если апстрим что-то напутал.
                    proxyRes.headers['cache-control'] = 'no-cache, no-transform'
                    proxyRes.headers['x-accel-buffering'] = 'no'
                    delete proxyRes.headers['content-length']
                  }
                })
              },
              rewrite: (requestPath) =>
                requestPath.replace(new RegExp(`^${escapedPrefix}`), ''),
            },
          }
        : undefined,
    },
  }
})

function requireEnv(name: string): string {
  const value = (import.meta.env as Record<string, unknown>)[name]
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

// В dev проксируем запросы через Vite, чтобы браузер не делал CORS/preflight к внешнему API.
// В prod используем абсолютный URL (который задается через .env).
const PROD_API_BASE_URL = requireEnv('VITE_API_BASE_URL')

function getProxyPrefix(apiBaseUrl: string): string {
  // Берем только pathname (например `/schedule`) из абсолютного URL,
  // чтобы dev-запросы ходили на тот же префикс, который проксирует Vite.
  try {
    if (/^https?:\/\//i.test(apiBaseUrl)) {
      const pathname = new URL(apiBaseUrl).pathname.replace(/\/+$/, '')
      if (!pathname) {
        throw new Error(`Invalid VITE_API_BASE_URL (empty pathname): ${apiBaseUrl}`)
      }
      return pathname
    }
  } catch {
    // ignore: ниже проверим, что это допустимый pathname-префикс
  }

  // Если передали не абсолютный URL, считаем что это уже pathname-префикс.
  const asPath = apiBaseUrl.replace(/\/+$/, '')
  if (!asPath) {
    throw new Error(`Invalid VITE_API_BASE_URL (empty path): ${apiBaseUrl}`)
  }
  return asPath.startsWith('/') ? asPath : `/${asPath}`
}

if (import.meta.env.DEV && !/^https?:\/\//i.test(PROD_API_BASE_URL)) {
  throw new Error('DEV mode requires absolute VITE_API_BASE_URL (including protocol)')
}

const API_BASE_URL = import.meta.env.DEV ? getProxyPrefix(PROD_API_BASE_URL) : PROD_API_BASE_URL

// Обрезаем возможный префикс "Bearer " в переменной окружения,
// чтобы заголовок Authorization не содержал дубликат "Bearer".
const RAW_API_TOKEN = requireEnv('VITE_API_TOKEN')
const API_TOKEN = RAW_API_TOKEN.replace(/^Bearer\s+/i, '')

export function getApiBaseUrl(): string {
  return API_BASE_URL.replace(/\/+$/, '')
}

export function getApiToken(): string {
  return API_TOKEN
}


// В dev проксируем запросы через Vite, чтобы браузер не делал CORS/preflight к внешнему API.
// В prod используем абсолютный URL (который может быть переопределен через .env).
const PROD_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://api.myimsit.ru/schedule'

const API_BASE_URL = import.meta.env.DEV ? '/schedule' : PROD_API_BASE_URL

// Обрезаем возможный префикс "Bearer " в переменной окружения,
// чтобы заголовок Authorization не содержал дубликат "Bearer".
const RAW_API_TOKEN =
  import.meta.env.VITE_API_TOKEN || '281587d1627304c87bb1bb35c8157cf15fa06ac1f285a966527b3e5729799994'
const API_TOKEN = RAW_API_TOKEN.replace(/^Bearer\s+/i, '')

export function getApiBaseUrl(): string {
  return API_BASE_URL.replace(/\/+$/, '')
}

export function getApiToken(): string {
  return API_TOKEN
}


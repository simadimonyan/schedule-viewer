import { getApiBaseUrl, getApiToken } from './config'

export interface ApiError {
  message: string
  status?: number
}

export interface RequestOptions extends RequestInit {
  // Используем максимально простой словарь, чтобы обойти ограничения типов
  // в tsconfig (`erasableSyntaxOnly`)
  query?: Record<string, string | number | boolean | undefined>
}

/* Текст вместо браузерного «Failed to fetch» — его видит пользователь. */
export const NETWORK_ERROR_MESSAGE =
  'Не удалось связаться с сервером расписания. Проверьте интернет и попробуйте ещё раз.'

const RETRY_DELAYS_MS = [400, 1200]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* GET с повтором. На старте приложение шлёт пачку запросов, и nginx
 * (limit_req по IP) отбивает лишние 503 без CORS-заголовков — браузер
 * видит это как TypeError «Failed to fetch», а не как ответ. Поэтому
 * повторяем и сетевой сбой, и честные 503/429: через полсекунды лимит
 * уже пропускает. Разброс задержки — чтобы повторы не ушли снова пачкой. */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const last = attempt >= RETRY_DELAYS_MS.length
    try {
      const response = await fetch(url, init)
      if (last || (response.status !== 503 && response.status !== 429)) return response
    } catch (e) {
      if (!(e instanceof TypeError) || init.signal?.aborted) throw e
      if (last) {
        const err: ApiError = { message: NETWORK_ERROR_MESSAGE }
        throw err
      }
    }
    await sleep(RETRY_DELAYS_MS[attempt]! + Math.random() * 300)
  }
}

export async function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const token = getApiToken()

  const pathNorm = path.replace(/^\//, '')
  const baseNorm = baseUrl.replace(/\/+$/, '')

  let requestUrl: string
  if (/^https?:\/\//i.test(baseNorm)) {
    requestUrl = new URL(pathNorm, `${baseNorm}/`).toString()
  } else {
    requestUrl = baseNorm + '/' + pathNorm
  }

  if (options.query) {
    const params = new URLSearchParams()
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })
    const qs = params.toString()
    if (qs) requestUrl += (requestUrl.includes('?') ? '&' : '?') + qs
  }

  console.log('API request:', requestUrl, 'token:', token ? '***' : 'none')

  const response = await fetchWithRetry(requestUrl, {
    method: 'GET',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    let message = `Ошибка запроса (${response.status})`
    let responseBody = null
    try {
      responseBody = await response.text()
      const data = JSON.parse(responseBody) as { message?: string }
      if (data?.message) {
        message = data.message
      }
    } catch {
      // ignore
    }
    console.error('API request failed:', {
      url: requestUrl,
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    })

    const err: ApiError = {
      message,
      status: response.status,
    }
    throw err
  }

  return (await response.json()) as T
}

/* POST helper — для лёгких side-effect endpoints (heartbeat, лайки и т.п.).
 * Возвращает либо JSON (если backend ответил json), либо текстовое тело —
 * вызывающий обычно игнорирует возврат. */
export async function apiPost<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T | string | null> {
  const baseUrl = getApiBaseUrl()
  const token = getApiToken()

  const pathNorm = path.replace(/^\//, '')
  const baseNorm = baseUrl.replace(/\/+$/, '')

  let requestUrl: string
  if (/^https?:\/\//i.test(baseNorm)) {
    requestUrl = new URL(pathNorm, `${baseNorm}/`).toString()
  } else {
    requestUrl = baseNorm + '/' + pathNorm
  }

  if (options.query) {
    const params = new URLSearchParams()
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })
    const qs = params.toString()
    if (qs) requestUrl += (requestUrl.includes('?') ? '&' : '?') + qs
  }

  const response = await fetch(requestUrl, {
    method: 'POST',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const err: ApiError = {
      message: `Ошибка POST (${response.status})`,
      status: response.status,
    }
    throw err
  }

  // Пытаемся распарсить JSON; если не получилось — возвращаем текст.
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return (await response.json()) as T
    } catch {
      return null
    }
  }
  try {
    return await response.text()
  } catch {
    return null
  }
}

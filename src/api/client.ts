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

  const response = await fetch(requestUrl, {
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
    try {
      const data = (await response.json()) as { message?: string }
      if (data?.message) {
        message = data.message
      }
    } catch {
      // ignore
    }

    const err: ApiError = {
      message,
      status: response.status,
    }
    throw err
  }

  return (await response.json()) as T
}


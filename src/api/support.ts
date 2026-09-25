/**
 * Отправка обращения в поддержку: `POST {SUPPORT_URL}`, multipart/form-data.
 *
 * Адрес:
 *  - VITE_SUPPORT_URL, если задана;
 *  - локальный запуск (vite dev) — /support/report → прокси на сервис ботов :8090;
 *  - иначе при абсолютном VITE_API_BASE_URL (прод) — его origin + /support/report;
 *  - иначе (стенд с префиксом пути) — /support/report на свой origin, его
 *    переправляет прокси Vite (vite.config.ts).
 *
 * Идёт через XMLHttpRequest, а не fetch: нужен прогресс выгрузки видео.
 * Заголовок Authorization не ставится — ручка поддержки публичная.
 */

export const SUPPORT_LIMITS = {
  maxFiles: 5,
  maxTotalBytes: 45 * 1024 * 1024,
  device: 200,
  description: 4000,
  happenedAt: 200,
  contact: 200,
} as const

export interface SupportReport {
  device: string
  description: string
  happenedAt: string
  contact: string
  page: string
  website: string
  files: File[]
  logs: Blob | null
}

export type SupportErrorKind = 'invalid' | 'too_large' | 'rate_limited' | 'network' | 'server' | 'aborted'

export class SupportError extends Error {
  readonly kind: SupportErrorKind
  readonly status: number

  constructor(kind: SupportErrorKind, message: string, status = 0) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

export function getSupportUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>
  const explicit = env.VITE_SUPPORT_URL?.trim()
  if (explicit) return explicit
  // Локальный запуск (vite dev) — всегда в локальный сервис ботов через прокси
  // Vite, даже когда расписание берётся с боевого API: иначе проверка формы
  // с ноутбука завела бы обращение на проде.
  if (import.meta.env.DEV) return '/support/report'
  const apiBase = env.VITE_API_BASE_URL?.trim() ?? ''
  if (/^https?:\/\//i.test(apiBase)) {
    try {
      return `${new URL(apiBase).origin}/support/report`
    } catch {
      // упадём на относительный адрес ниже
    }
  }
  return '/support/report'
}

function detailOf(xhr: XMLHttpRequest): string {
  try {
    const data = JSON.parse(xhr.responseText) as { detail?: unknown }
    if (typeof data.detail === 'string') return data.detail
    // FastAPI отдаёт ошибки валидации списком.
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((d: { msg?: string }) => d?.msg)
        .filter(Boolean)
        .join('; ')
    }
  } catch {
    // тело не JSON
  }
  return ''
}

function errorFor(xhr: XMLHttpRequest): SupportError {
  const { status } = xhr
  const detail = detailOf(xhr)
  if (status === 400 || status === 422) {
    return new SupportError('invalid', detail || 'Сервер не принял обращение: проверьте поля формы.', status)
  }
  if (status === 413) {
    return new SupportError(
      'too_large',
      'Файлы слишком большие для отправки. Вместе — не больше 45 МБ: уберите часть или сожмите видео.',
      status,
    )
  }
  if (status === 429) {
    return new SupportError(
      'rate_limited',
      'Слишком много обращений подряд. Подождите минут десять и отправьте ещё раз — введённое не пропадёт.',
      status,
    )
  }
  return new SupportError(
    'server',
    `Сервер поддержки сейчас не отвечает (код ${status}). Попробуйте чуть позже.`,
    status,
  )
}

export interface SendHandle {
  promise: Promise<{ id: number | string | null }>
  abort: () => void
}

export function sendSupportReport(report: SupportReport, onProgress?: (fraction: number) => void): SendHandle {
  const form = new FormData()
  form.append('device', report.device)
  form.append('description', report.description)
  form.append('happened_at', report.happenedAt)
  if (report.contact) form.append('contact', report.contact)
  form.append('source', 'site')
  form.append('page', report.page)
  form.append('website', report.website)
  if (report.logs) form.append('logs', report.logs, 'logs.json')
  for (const file of report.files) form.append('files', file, file.name)

  const xhr = new XMLHttpRequest()
  const promise = new Promise<{ id: number | string | null }>((resolve, reject) => {
    xhr.open('POST', getSupportUrl())
    xhr.responseType = 'text'
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { id?: number | string }
          resolve({ id: data.id ?? null })
        } catch {
          resolve({ id: null })
        }
        return
      }
      reject(errorFor(xhr))
    }
    xhr.onerror = () =>
      reject(new SupportError('network', 'Не получилось связаться с сервером. Проверьте интернет и попробуйте ещё раз.'))
    xhr.ontimeout = xhr.onerror
    xhr.onabort = () => reject(new SupportError('aborted', 'Отправка отменена.'))
    xhr.send(form)
  })

  return { promise, abort: () => xhr.abort() }
}

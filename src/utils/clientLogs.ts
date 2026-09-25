/**
 * Журнал клиента для обращений в поддержку.
 *
 * Модуль ставит себя сам при первом импорте — `main.ts` импортирует его
 * первым, до остальных модулей, чтобы поймать и ошибки их инициализации.
 *
 * Что пишется: console.error / console.warn, window.onerror,
 * unhandledrejection, запросы fetch (метод, путь, статус, длительность),
 * смены маршрута. Чего не пишется: заголовки запросов (там Authorization),
 * тела запросов и ответов, параметры с токенами, console.log.
 *
 * Буфер кольцевой, зеркалится в sessionStorage — после падения и
 * перезагрузки вкладки записи прошлого захода остаются в журнале.
 */

export type LogKind = 'error' | 'warn' | 'exception' | 'rejection' | 'net' | 'route' | 'boot'

export interface LogEntry {
  /** Время записи, мс с эпохи. */
  t: number
  kind: LogKind
  msg: string
  /** Номер загрузки страницы в пределах вкладки: 1, 2, … */
  load: number
}

const MAX_ENTRIES = 300
const MAX_MSG = 1000
const MAX_STACK = 1500
const STORAGE_KEY = 'academy:client-logs'
const LOAD_KEY = 'academy:client-logs-load'
/** Параметры, которые не должны попасть в журнал даже из query. */
const SECRET_PARAM = /^(access_?token|refresh_?token|id_?token|token|code|session_state|password|secret|key)$/i

const bootedAt = Date.now()
let entries: LogEntry[] = []
let loadNo = 1
let installed = false
let flushTimer: ReturnType<typeof setTimeout> | null = null

export function truncate(value: string, max = MAX_MSG): string {
  return value.length > max ? `${value.slice(0, max)}… [+${value.length - max}]` : value
}

function describe(value: unknown): string {
  if (value instanceof Error) {
    const stack = value.stack ? `\n${truncate(value.stack, MAX_STACK)}` : ''
    return `${value.name}: ${value.message}${stack}`
  }
  if (typeof value === 'string') return value
  if (value === undefined) return 'undefined'
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

function persistSoon(): void {
  if (flushTimer) return
  flushTimer = setTimeout(persistNow, 400)
}

function persistNow(): void {
  flushTimer = null
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Хранилище недоступно или переполнено — журнал живёт в памяти.
  }
}

export function record(kind: LogKind, msg: string): void {
  entries.push({ t: Date.now(), kind, msg: truncate(msg), load: loadNo })
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES)
  persistSoon()
}

/** Адрес без секретов: путь и query остаются, токеноподобные параметры — нет. */
export function sanitizeUrl(raw: string): string {
  try {
    const url = new URL(raw, window.location.href)
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_PARAM.test(key)) url.searchParams.set(key, '***')
    }
    const sameOrigin = url.origin === window.location.origin
    return truncate(`${sameOrigin ? '' : url.origin}${url.pathname}${url.search}`, 400)
  } catch {
    return truncate(raw.split('#')[0] ?? '', 400)
  }
}

function patchConsole(): void {
  for (const level of ['error', 'warn'] as const) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      try {
        record(level, args.map(describe).join(' '))
      } catch {
        // Журнал не должен ломать консоль.
      }
      original(...args)
    }
  }
}

function patchFetch(): void {
  if (typeof window.fetch !== 'function') return
  const original = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const started = performance.now()
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const rawUrl = input instanceof Request ? input.url : String(input)
    const url = sanitizeUrl(rawUrl)
    try {
      const response = await original(input, init)
      const ms = Math.round(performance.now() - started)
      record('net', `${method} ${url} → ${response.status} (${ms} мс)`)
      return response
    } catch (err) {
      const ms = Math.round(performance.now() - started)
      const aborted = err instanceof DOMException && err.name === 'AbortError'
      record('net', `${method} ${url} → ${aborted ? 'отменён' : `сбой: ${describe(err)}`} (${ms} мс)`)
      throw err
    }
  }
}

function listenGlobalErrors(): void {
  window.addEventListener('error', (event) => {
    // Ошибка загрузки ресурса (<img>, <script>) приходит без message.
    const target = event.target as HTMLElement | null
    if (target && target !== (window as unknown as HTMLElement) && !(event instanceof ErrorEvent)) {
      const src = (target as HTMLImageElement).src || (target as HTMLLinkElement).href || ''
      record('exception', `Не загрузился ресурс <${target.tagName?.toLowerCase()}> ${sanitizeUrl(src)}`)
      return
    }
    const where = event.filename ? ` @ ${sanitizeUrl(event.filename)}:${event.lineno}:${event.colno}` : ''
    record('exception', `${event.error ? describe(event.error) : event.message}${where}`)
  }, true)

  window.addEventListener('unhandledrejection', (event) => {
    record('rejection', describe(event.reason))
  })
}

export function installClientLogs(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as unknown
      if (Array.isArray(parsed)) entries = (parsed as LogEntry[]).slice(-MAX_ENTRIES)
    }
    loadNo = Number(sessionStorage.getItem(LOAD_KEY) || '0') + 1
    sessionStorage.setItem(LOAD_KEY, String(loadNo))
  } catch {
    // Нет sessionStorage — начинаем с пустого журнала.
  }

  record('boot', `Загрузка страницы ${sanitizeUrl(window.location.href)}`)
  patchConsole()
  patchFetch()
  listenGlobalErrors()
  window.addEventListener('pagehide', persistNow)
}

export function recordRouteChange(to: string, from: string): void {
  record('route', from ? `${sanitizeUrl(from)} → ${sanitizeUrl(to)}` : sanitizeUrl(to))
}

export function getLogEntries(): LogEntry[] {
  return entries.slice()
}

export interface ClientEnvironment {
  url: string
  userAgent: string
  platform: string
  language: string
  languages: string
  timeZone: string
  screen: string
  viewport: string
  dpr: number
  theme: string
  online: boolean
  touch: boolean
  loadedAt: string
  pageLoadMs: number | null
  collectedAt: string
  buildMode: string
  route: { group?: string; teacher?: string }
}

export function collectEnvironment(): ClientEnvironment {
  const nav = window.navigator as Navigator & { userAgentData?: { platform?: string } }
  const navEntry = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined
  const path = window.location.pathname
  const group = /^\/group\/([^/]+)/.exec(path)?.[1]
  const teacher = /^\/teacher\/([^/]+)/.exec(path)?.[1]

  let timeZone = ''
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    // старый браузер
  }

  return {
    url: sanitizeUrl(window.location.href),
    userAgent: truncate(nav.userAgent, 400),
    platform: nav.userAgentData?.platform || nav.platform || '',
    language: nav.language,
    languages: (nav.languages || []).join(', '),
    timeZone,
    screen: `${window.screen.width}×${window.screen.height}`,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    dpr: window.devicePixelRatio || 1,
    theme: document.documentElement.getAttribute('data-theme') || 'light',
    online: nav.onLine,
    touch: nav.maxTouchPoints > 0,
    loadedAt: new Date(bootedAt).toISOString(),
    pageLoadMs: navEntry && navEntry.loadEventEnd > 0 ? Math.round(navEntry.loadEventEnd) : null,
    collectedAt: new Date().toISOString(),
    buildMode: import.meta.env.MODE,
    route: {
      ...(group ? { group: decodeURIComponent(group) } : {}),
      ...(teacher ? { teacher: decodeURIComponent(teacher) } : {}),
    },
  }
}

/** Содержимое logs.json — ровно то, что показывает предпросмотр в форме. */
export function buildLogsPayload(): { environment: ClientEnvironment; entries: LogEntry[] } {
  return { environment: collectEnvironment(), entries: getLogEntries() }
}

installClientLogs()

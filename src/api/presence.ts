/**
 * Presence API — онлайн-индикатор и топ просмотров.
 *
 * Backend endpoints:
 *   POST /api/v1/configuration/online/heartbeat/{uuid}  — heartbeat клиента
 *   GET  /api/v1/configuration/online/sse               — SSE поток с count'ом
 *   GET  /api/v1/configuration/online/top/{mode}        — топ групп / преподов
 */

import { apiGet, apiPost } from './client'
import { getApiBaseUrl, getApiToken } from './config'
import { withCache, type WithCacheOptions } from './cache'

const PRESENCE_BASE = '/api/v1/configuration/online'

/** Отправить heartbeat для UUID. Backend помечает клиента как онлайн. */
export function sendHeartbeat(uuid: string): Promise<unknown> {
  return apiPost(`${PRESENCE_BASE}/heartbeat/${encodeURIComponent(uuid)}`)
}

/** Один топ-элемент: ключ (group/teacher name) + значение (число просмотров). */
export interface TopEntry {
  key: string
  value: number
}

export type TopMode = 'groups' | 'teachers'

/**
 * Получить топ. Backend может вернуть:
 *   — Map<String, Long> сериализованный в JSON-объект `{key: value}`
 *   — Массив пар `[{key, value}]` или `[[key, value]]`
 * Нормализуем к массиву TopEntry, отсортированному по value desc.
 *
 * Кешируется на 1 час (см. `withCache` defaults). Если на каком-то
 * экране нужны "свежие" данные, можно передать `cacheOpts.ttl: 0`.
 */
export function getTop(
  mode: TopMode,
  cacheOpts: WithCacheOptions = {},
): Promise<TopEntry[]> {
  return withCache(
    `presence:top:${mode}`,
    async () => {
      const raw = await apiGet<unknown>(`${PRESENCE_BASE}/top/${mode}`)
      return normalizeTop(raw)
    },
    cacheOpts,
  )
}

function normalizeTop(raw: unknown): TopEntry[] {
  if (!raw) return []

  // Map<String, Number> в виде объекта {ключ: значение}
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    return Object.entries(obj)
      .map(([key, value]) => ({
        key,
        value: typeof value === 'number' ? value : Number(value) || 0,
      }))
      .sort((a, b) => b.value - a.value)
  }

  // Массив
  if (Array.isArray(raw)) {
    return raw
      .map((item): TopEntry | null => {
        // [{key, value}] | [{name, count}] | [[key, value]]
        if (Array.isArray(item) && item.length >= 2) {
          return { key: String(item[0]), value: Number(item[1]) || 0 }
        }
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>
          const key =
            (o.key ?? o.name ?? o.id ?? o.label ?? '') as string | number
          const value = Number(o.value ?? o.views ?? o.count ?? 0) || 0
          if (key === '' || key === null || key === undefined) return null
          return { key: String(key), value }
        }
        return null
      })
      .filter((x): x is TopEntry => x !== null)
      .sort((a, b) => b.value - a.value)
  }

  return []
}

/**
 * Подписка на SSE-поток онлайн-счётчика.
 *
 * Backend шлёт событие `online-event` (формат SSE: `event:`/`data:`/`id:` с
 * пустой строкой между событиями). Каждый `data:` — число активных онлайн.
 *
 * Реализация через `fetch` + `ReadableStream` (а не нативный `EventSource`),
 * потому что бэкенду нужен `Authorization: Bearer ...` заголовок, который
 * `EventSource` не умеет ставить.
 *
 * Поведение:
 *   — Авто-реконнект через 5s при разрыве соединения (если не вызван unsubscribe).
 *   — Корректный cleanup через AbortController.
 *
 * Возвращает функцию-unsubscribe.
 */
export function subscribeOnline(
  onCount: (count: number) => void,
  onError?: (err: unknown) => void,
): () => void {
  const baseUrl = getApiBaseUrl()
  const token = getApiToken()

  const path = `${PRESENCE_BASE}/sse`
  let url: string
  if (/^https?:\/\//i.test(baseUrl)) {
    url = new URL(path.replace(/^\//, ''), baseUrl.replace(/\/+$/, '') + '/').toString()
  } else {
    url = baseUrl.replace(/\/+$/, '') + path
  }

  let aborted = false
  let abortController: AbortController | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  const RECONNECT_DELAY_MS = 5_000

  /** Парсит накопленный SSE-буфер: режет на события по пустой строке,
   *  возвращает остаток (не-завершённое событие) и массив готовых событий. */
  function parseSse(buffer: string): { rest: string; events: Array<{ event: string; data: string }> } {
    const events: Array<{ event: string; data: string }> = []
    // SSE-спека допускает разделители \n\n, \r\n\r\n и \r\r
    const parts = buffer.split(/\r\n\r\n|\n\n|\r\r/)
    const rest = parts.pop() ?? ''
    for (const block of parts) {
      if (!block.trim()) continue
      let event = 'message'
      const dataLines: string[] = []
      for (const line of block.split(/\r\n|\n|\r/)) {
        if (line.startsWith(':')) continue // comment, например keep-alive
        const idx = line.indexOf(':')
        const field = idx === -1 ? line : line.slice(0, idx)
        const value = idx === -1 ? '' : line.slice(idx + 1).replace(/^ /, '')
        if (field === 'event') event = value
        else if (field === 'data') dataLines.push(value)
        // 'id' и 'retry' игнорируем — для нашего use case не нужны
      }
      if (dataLines.length === 0) continue
      events.push({ event, data: dataLines.join('\n') })
    }
    return { rest, events }
  }

  function handleData(data: string) {
    const trimmed = data.trim()
    if (!trimmed) return

    // Backend шлёт OnlineEvent — record `{ online: long }`, Jackson
    // сериализует его в JSON `{"online": N}`. Поддерживаем также plain-число
    // на случай, если контракт в будущем упростят.
    let count: number | null = null

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        if (parsed && typeof parsed === 'object') {
          const obj = parsed as Record<string, unknown>
          // Принимаем разные варианты ключа на стороне бэка
          const raw = obj.online ?? obj.count ?? obj.value
          const n = typeof raw === 'number' ? raw : Number(raw)
          if (Number.isFinite(n)) count = n
        } else if (typeof parsed === 'number' && Number.isFinite(parsed)) {
          count = parsed
        }
      } catch {
        // ignore — провалимся в fallback ниже
      }
    }

    if (count === null) {
      const n = Number(trimmed)
      if (Number.isFinite(n)) count = n
    }

    if (count !== null) onCount(count)
  }

  async function connect() {
    if (aborted) return

    abortController = new AbortController()

    try {
      const headers: Record<string, string> = {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      }
      if (token) headers.Authorization = `Bearer ${token}`

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: abortController.signal,
        // Браузер не должен буферизовать SSE — оставляем default credentials.
      })

      if (!response.ok || !response.body) {
        throw new Error(`SSE HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (!aborted) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const { rest, events } = parseSse(buffer)
        buffer = rest
        for (const ev of events) {
          // Backend шлёт event-name "online-event"; принимаем также дефолтный
          // 'message' на случай, если конфиг изменится.
          if (ev.event === 'online-event' || ev.event === 'message') {
            handleData(ev.data)
          }
        }
      }
    } catch (err) {
      if (aborted) return
      if (onError) onError(err)
      // Schedule reconnect
      reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
      return
    }

    // Поток закрыт сервером без ошибки — пробуем реконнект
    if (!aborted) {
      reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
    }
  }

  // Запускаем без await — функция должна вернуть unsubscribe немедленно
  void connect()

  return () => {
    aborted = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (abortController) abortController.abort()
  }
}

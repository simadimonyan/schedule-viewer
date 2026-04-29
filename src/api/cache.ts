/**
 * Слой кеширования для GET-запросов к API расписания.
 *
 * Зачем: API-сервер за nginx, и многие запросы (список групп, курсы,
 * уровни, расписание группы на текущей неделе) повторяются десятками
 * раз за сессию — при переходах между страницами, ре-рендерах, навигации
 * назад/вперёд. Кеш гарантирует, что одинаковый запрос уйдёт в сеть не
 * чаще раза в `ttl`.
 *
 * Реализация — двухуровневая:
 *   L0 — in-memory `Map`. Самый быстрый, доступ за O(1).
 *   L1 — `localStorage`. Переживает ре-load страницы. Чуть медленнее
 *        (JSON.parse), но всё равно бесплатно по сравнению с сетью.
 *
 * Плюс встроенный in-flight dedup: если по одному и тому же ключу
 * летит запрос и одновременно прилетает второй вызов — оба получат
 * один и тот же `Promise`, и в сеть уйдёт ровно один запрос.
 *
 * Любые ошибки уровня хранилища (private mode, превышен квота
 * localStorage, повреждённый JSON) проглатываются — кеш degradates
 * gracefully до прямого вызова fetcher'а.
 */

/** Дефолтный TTL — 1 час (по требованию: «переиспользуй с ttl на час»). */
export const DEFAULT_TTL_MS = 60 * 60 * 1000

/** Префикс localStorage-ключей, чтобы наш кеш отделялся от ad-hoc
 *  storage'а UI-компонентов и его легко было очистить. */
const STORAGE_PREFIX = 'apicache:'

interface CacheEntry<T> {
  value: T
  /** Абсолютный момент времени, после которого запись считается стухшей. */
  expiry: number
}

/** L0 — in-memory кеш. Живёт ровно столько, сколько SPA-сессия. */
const memoryCache = new Map<string, CacheEntry<unknown>>()

/** In-flight промисы по ключу — для дедупа параллельных запросов. */
const inflight = new Map<string, Promise<unknown>>()

function nowMs(): number {
  return Date.now()
}

/** Достать из localStorage и десериализовать. Возвращает null
 *  при любых проблемах (нет ключа, испорчен JSON, тип не тот). */
function readStorage<T>(key: string): CacheEntry<T> | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry<T>
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.expiry !== 'number'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Записать в localStorage. Никогда не падает — quota exceeded
 *  и прочие ошибки тихо игнорируются. */
function writeStorage<T>(key: string, entry: CacheEntry<T>): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // ignore — кеш не критичен для функциональности
  }
}

function removeStorage(key: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    // ignore
  }
}

/** Проверить L0+L1 и вернуть свежее значение, если есть. */
function readFresh<T>(key: string): T | undefined {
  const t = nowMs()

  const mem = memoryCache.get(key) as CacheEntry<T> | undefined
  if (mem && mem.expiry > t) return mem.value

  const stored = readStorage<T>(key)
  if (stored && stored.expiry > t) {
    // Подтянули в L0, чтобы дальше отвечать без обращения к localStorage.
    memoryCache.set(key, stored)
    return stored.value
  }

  // Запись стухла — чистим, чтобы не накапливать мусор.
  if (mem && mem.expiry <= t) memoryCache.delete(key)
  if (stored && stored.expiry <= t) removeStorage(key)

  return undefined
}

export interface WithCacheOptions {
  /** TTL в миллисекундах. По умолчанию `DEFAULT_TTL_MS` (1 час). */
  ttl?: number
  /**
   * Колбэк, который вызывается, если запрос обслужен из кеша
   * (любого уровня) либо из in-flight дедупа. Удобно для
   * аналитики ("Получить кешированный список ...").
   */
  onCacheHit?: () => void
  /**
   * Колбэк после успешного сетевого fetch'а. Удобно для аналитики
   * ("Получить ... из сервера").
   */
  onCacheMiss?: () => void
}

/**
 * Запускает `fetcher`, но сначала проверяет кеш. При попадании
 * возвращает кешированное значение БЕЗ сетевого запроса.
 *
 * Гарантии:
 *   — Параллельные вызовы с одинаковым `key` дедуплицируются:
 *     fetcher выполнится ровно один раз, оба вызова получат один
 *     и тот же `Promise`.
 *   — При ошибке fetcher'а кеш не пишется, и следующий вызов
 *     попробует снова уйти в сеть.
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: WithCacheOptions = {},
): Promise<T> {
  const ttl = options.ttl ?? DEFAULT_TTL_MS

  // 1. L0/L1 hit
  const cached = readFresh<T>(key)
  if (cached !== undefined) {
    options.onCacheHit?.()
    return cached
  }

  // 2. In-flight dedup — если уже летит идентичный запрос, ждём его.
  const pending = inflight.get(key) as Promise<T> | undefined
  if (pending) {
    options.onCacheHit?.()
    return pending
  }

  // 3. Идём в сеть.
  const promise = (async () => {
    try {
      const value = await fetcher()
      const entry: CacheEntry<T> = {
        value,
        expiry: nowMs() + ttl,
      }
      memoryCache.set(key, entry)
      writeStorage(key, entry)
      return value
    } finally {
      // Снимаем in-flight в любом случае — даже если ошибка,
      // следующий вызов пойдёт в сеть заново, а не повиснет.
      inflight.delete(key)
    }
  })()

  inflight.set(key, promise)

  try {
    const value = await promise
    options.onCacheMiss?.()
    return value
  } catch (e) {
    // Ошибки кешировать не надо. Просто пробрасываем.
    throw e
  }
}

/** Принудительно сбросить запись по ключу. Полезно после операций
 *  записи (swapWeek и т.п.), которые меняют связанные read-эндпоинты. */
export function invalidate(key: string): void {
  memoryCache.delete(key)
  inflight.delete(key)
  removeStorage(key)
}

/** Сбросить все записи, у которых ключ начинается с указанного префикса.
 *  Удобно, например, выкинуть весь schedule-кеш одним вызовом. */
export function invalidateByPrefix(prefix: string): void {
  for (const k of Array.from(memoryCache.keys())) {
    if (k.startsWith(prefix)) memoryCache.delete(k)
  }
  for (const k of Array.from(inflight.keys())) {
    if (k.startsWith(prefix)) inflight.delete(k)
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const fullPrefix = STORAGE_PREFIX + prefix
      // Снимок ключей, потому что по ходу удаления индексы сдвигаются.
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(fullPrefix)) keys.push(k)
      }
      for (const k of keys) localStorage.removeItem(k)
    } catch {
      // ignore
    }
  }
}

/** Полная очистка кеша (для devtools/debug). */
export function clearAll(): void {
  invalidateByPrefix('')
}

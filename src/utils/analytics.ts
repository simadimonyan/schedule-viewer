/**
 * MyTracker (Top.Mail.Ru) — обёртка над `_tmr.push`.
 *
 * Имена событий полностью совпадают с теми, что прописаны в мобильных
 * приложениях (Android/iOS) — благодаря этому метрики на вебе и на
 * мобиле объединяются в одну метрику в дашборде Top.Mail.Ru.
 *
 * К каждому goal'у автоматически приклеивается параметр `source` —
 * `web` / `max` / `telegram`. Источник определяется ОДИН РАЗ при
 * первом вызове и кешируется в sessionStorage, чтобы при переходах
 * между страницами SPA значение не «улетало», даже если стартовый
 * URL-параметр `?source=...` потерялся.
 *
 * Счётчик подключён статически в `index.html` (см. `_tmr.push pageView`).
 * Если Top.Mail.Ru недоступен (adblock / нет сети) — `_tmr` всё равно
 * есть в `window` как массив, и push'и просто копятся в нём, не падая.
 */

const COUNTER_ID = '3762644'

/* Канал, в котором запущено приложение. */
export type Source = 'web' | 'max' | 'telegram'

/* Единый словарь имён событий — ровно те же строки, что используются
 * в мобильном клиенте (см. дашборд Top.Mail.Ru). Лежат в одном месте,
 * чтобы случайно не сделать опечатку и не разбить метрику пополам. */
export const EVENTS = {
  // Открытие расписаний
  OPEN_GROUP_TODAY: 'Открыть расписание группы на сегодня',
  OPEN_GROUP_WEEK: 'Открыть расписание группы на неделю',
  OPEN_GROUP_SESSION: 'Открыть расписание заочной группы (сессия)',
  OPEN_TEACHER_TODAY: 'Открыть расписание преподавателя на сегодня',
  OPEN_TEACHER_WEEK: 'Открыть расписание преподавателя на неделю',

  // Сетевые запросы — успешные ответы от сервера
  FETCH_GROUP_SCHEDULE: 'Получить расписание группы из сервера',
  FETCH_TEACHER_SCHEDULE: 'Получить расписание преподавателя из сервера',
  FETCH_GROUPS_LIST: 'Получить список групп из сервера',
  FETCH_TEACHERS_LIST: 'Получить список преподавателей из сервера',
  FETCH_COURSES: 'Получить список курсов из сервера',
  FETCH_LEVELS: 'Получить список уровней из сервера',

  // Кеш-хиты
  CACHED_GROUPS_LIST: 'Получить кешированный список групп',
  CACHED_TEACHERS_LIST: 'Получить кешированный список преподавателей',
  CACHED_COURSES: 'Получить кешированный список курсов',
  CACHED_LEVELS: 'Получить кешированный список уровней',

  // Выбор сущностей
  SELECT_GROUP: 'Выбрать группу',
  SELECT_TEACHER: 'Выбрать преподавателя',
  SELECT_COURSE: 'Выбрать курс',
  SELECT_LEVEL: 'Выбрать уровень образования',

  // Навигация
  GOTO_HOME: 'Перейти на главный экран',
  GOTO_SCHEDULE: 'Перейти на экран расписания',

  // Переключения чётности недели
  SWITCH_WEEK_FIRST: 'Переключить расписание на первую неделю',
  SWITCH_WEEK_SECOND: 'Переключить расписание на вторую неделю',
  PARITY_LOCAL_TOGGLE: 'Локальная смена четности недели без синхронизации',

  // Режим
  ENABLE_STUDENT_MODE: 'Включить режим студента',
  ENABLE_TEACHER_MODE: 'Включить режим преподавателя',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

/* ────────────────────── Source detection ────────────────────── */

const SOURCE_STORAGE_KEY = 'analytics_source'

interface MaybeTelegramWindow {
  Telegram?: { WebApp?: unknown }
}

function detectSource(): Source {
  if (typeof window === 'undefined') return 'web'

  // 1. URL-параметр имеет приоритет — мобильное приложение, открывая
  //    веб-версию во встроенном webview, добавляет `?source=max` или
  //    `?source=telegram`. Это самый надёжный сигнал.
  try {
    const url = new URL(window.location.href)
    const fromQuery = (url.searchParams.get('source') || '').toLowerCase()
    if (fromQuery === 'max' || fromQuery === 'telegram' || fromQuery === 'web') {
      return fromQuery as Source
    }
  } catch {
    // ignore — упадём в эвристики ниже
  }

  // 2. Telegram Mini App — JS SDK кладёт `window.Telegram.WebApp`.
  const tg = (window as unknown as MaybeTelegramWindow).Telegram
  if (tg && tg.WebApp) {
    return 'telegram'
  }

  // 3. MAX-мессенджер. У них пока нет публичного JS API, поэтому
  //    смотрим на user-agent: вебвью MAX'а отдаёт собственный токен.
  const ua = navigator.userAgent || ''
  if (/\bMAX\b|MaxMessenger|MAXApp/i.test(ua)) {
    return 'max'
  }

  return 'web'
}

let cachedSource: Source | null = null

export function getSource(): Source {
  if (cachedSource) return cachedSource

  // Пробуем восстановить из sessionStorage — это нужно, чтобы при
  // переходах между страницами SPA, когда `?source=max` уже стёрся
  // из URL'а пользователем, источник остался прежним.
  try {
    const stored = sessionStorage.getItem(SOURCE_STORAGE_KEY)
    if (stored === 'web' || stored === 'max' || stored === 'telegram') {
      cachedSource = stored
      return stored
    }
  } catch {
    // sessionStorage может быть недоступен (private mode/CSP) — не
    // критично, продолжаем с детектом.
  }

  const detected = detectSource()
  cachedSource = detected

  try {
    sessionStorage.setItem(SOURCE_STORAGE_KEY, detected)
  } catch {
    // ignore
  }

  return detected
}

/* ────────────────────── Tracking API ────────────────────── */

interface TmrPushEvent {
  id: string
  type: string
  goal?: string
  url?: string
  value?: number
  params?: Record<string, unknown>
  start?: number
}

interface TmrWindow {
  _tmr?: TmrPushEvent[]
}

function getQueue(): TmrPushEvent[] {
  if (typeof window === 'undefined') return []
  const w = window as unknown as TmrWindow
  if (!w._tmr) w._tmr = []
  return w._tmr
}

/**
 * Шлёт цель в MyTracker. Любые `params` мерджатся с автоматическим
 * `source`. Имена параметров можно использовать в Top.Mail.Ru как
 * фильтры (например, `groupName`, `teacherName`, `weekCount`).
 *
 * Никаких throw — если что-то не так с _tmr, тихо проглатываем,
 * чтобы аналитика не ломала продуктовый поток.
 */
export function trackGoal(
  goal: EventName,
  params?: Record<string, unknown>,
): void {
  try {
    const queue = getQueue()
    queue.push({
      id: COUNTER_ID,
      type: 'reachGoal',
      goal,
      params: {
        source: getSource(),
        ...(params ?? {}),
      },
    })
  } catch {
    // ignore
  }
}

/**
 * Регистрирует переход в SPA. Top.Mail.Ru считает уникальные URL'ы
 * как просмотры, что важно для общей метрики «посещения».
 *
 * Вызывается из `router.afterEach` (см. main.ts).
 */
export function trackPageView(url?: string): void {
  try {
    const queue = getQueue()
    queue.push({
      id: COUNTER_ID,
      type: 'pageView',
      url: url ?? (typeof window !== 'undefined' ? window.location.href : undefined),
      start: Date.now(),
    })
  } catch {
    // ignore
  }
}

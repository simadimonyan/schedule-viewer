/**
 * Persistent client UUID — генерируется один раз и хранится в localStorage.
 * Используется для heartbeat'ов онлайн-присутствия (POST /online/heartbeat/:uuid).
 *
 * Если crypto.randomUUID() недоступен (старые браузеры), используем
 * RFC4122 v4 fallback на Math.random — для UI-only счётчика онлайн
 * этой энтропии достаточно.
 */

const STORAGE_KEY = 'client_uuid'

function generateUuid(): string {
  // Modern path
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  // Fallback — RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Возвращает persistent UUID клиента — создаёт при первом вызове. */
export function getClientUuid(): string {
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached && /^[0-9a-f-]{36}$/i.test(cached)) {
      return cached
    }
    const fresh = generateUuid()
    localStorage.setItem(STORAGE_KEY, fresh)
    return fresh
  } catch {
    // localStorage может быть недоступен (private mode и т.п.) — fallback
    // на in-memory UUID для текущей сессии.
    return generateUuid()
  }
}

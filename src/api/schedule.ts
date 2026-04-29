import type {
  ScheduleResponse,
  GroupsSearchResponse,
  GroupsLevelsResponse,
  GroupsCoursesResponse,
  TeachersSearchResponse,
  WeekConfigurationResponse,
} from '../types/schedule'
import { apiGet } from './client'
import { withCache, type WithCacheOptions } from './cache'

/**
 * Все GET-функции этого модуля проходят через `withCache` (TTL = 1 час
 * из cache.ts по умолчанию). Это значит:
 *
 *   — Повторный одинаковый запрос в течение часа НЕ улетает в сеть,
 *     ответ берётся из in-memory + localStorage.
 *   — Параллельные вызовы дедуплицируются: даже если три компоненты
 *     одновременно дёрнули `getCourses()`, fetch будет ровно один.
 *
 * Все cached-функции принимают опциональный `cacheOpts` с колбэками
 * `onCacheHit` / `onCacheMiss` — это нужно для аналитики, чтобы
 * различать "получено из сервера" и "получено из кеша" без второго
 * запроса в layer'е выше.
 */

export interface ScheduleParams {
  weekCount: number // 1 или 2 (четность недели)
  dayWeek?: string // день недели (опционально)
  date?: string // дата в формате "10.11" или "full" (опционально)
}

function toQuery(params: ScheduleParams): Record<string, string | number | boolean | undefined> {
  return {
    weekCount: params.weekCount,
    dayWeek: params.dayWeek,
    date: params.date,
  }
}

/**
 * Стабильно сериализуем параметры для cache-key. Нельзя просто
 * `JSON.stringify(obj)` — порядок ключей не гарантирован, и эквивалентные
 * объекты могут дать разные строки. Сортируем по имени.
 */
function stableQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
  return entries.map(([k, v]) => `${k}=${String(v)}`).join('&')
}

// ────────────────────────────── Группы ──────────────────────────────

export function getGroup(groupName: string, cacheOpts: WithCacheOptions = {}) {
  return withCache(
    `schedule:group:${groupName}`,
    () =>
      apiGet<{ id: number; name: string; course: number; level: string; studyForm: string }>(
        `/api/v1/groups/${encodeURIComponent(groupName)}`,
      ),
    cacheOpts,
  )
}

export function searchGroups(
  course: number,
  level?: string,
  cacheOpts: WithCacheOptions = {},
) {
  const key = `schedule:groups:search:${stableQuery({ course, level })}`
  return withCache(
    key,
    () => {
      const query: Record<string, string | number> = { course }
      if (level) query.level = level
      return apiGet<GroupsSearchResponse>(`/api/v1/groups/search`, { query })
    },
    cacheOpts,
  )
}

export function getGroupLevels(course: number, cacheOpts: WithCacheOptions = {}) {
  return withCache(
    `schedule:groups:levels:${course}`,
    () =>
      apiGet<GroupsLevelsResponse>(`/api/v1/groups/levels`, {
        query: { course },
      }),
    cacheOpts,
  )
}

export function getCourses(cacheOpts: WithCacheOptions = {}) {
  return withCache(
    `schedule:groups:courses`,
    () => apiGet<GroupsCoursesResponse>(`/api/v1/groups/courses`),
    cacheOpts,
  )
}

export function getGroupSchedule(
  groupName: string,
  params: ScheduleParams,
  cacheOpts: WithCacheOptions = {},
) {
  const key = `schedule:group-schedule:${groupName}:${stableQuery({
    ...toQuery(params),
  })}`
  return withCache(
    key,
    () =>
      apiGet<ScheduleResponse>(`/api/v1/groups/schedule`, {
        query: {
          group: groupName,
          ...toQuery(params),
        },
      }),
    cacheOpts,
  )
}

// ─────────────────────────── Преподаватели ───────────────────────────

export function getTeacher(teacherName: string, cacheOpts: WithCacheOptions = {}) {
  return withCache(
    `schedule:teacher:${teacherName}`,
    () =>
      apiGet<{ id: number; label: string; department: string }>(
        `/api/v1/teachers/${encodeURIComponent(teacherName)}`,
      ),
    cacheOpts,
  )
}

export function searchTeachers(department?: string, cacheOpts: WithCacheOptions = {}) {
  const key = `schedule:teachers:search:${stableQuery({ department })}`
  return withCache(
    key,
    () => {
      const query: Record<string, string> = {}
      if (department) query.department = department
      return apiGet<TeachersSearchResponse>(`/api/v1/teachers/search`, { query })
    },
    cacheOpts,
  )
}

export function getTeacherSchedule(
  teacherName: string,
  params: ScheduleParams,
  cacheOpts: WithCacheOptions = {},
) {
  const key = `schedule:teacher-schedule:${teacherName}:${stableQuery({
    ...toQuery(params),
  })}`
  return withCache(
    key,
    () =>
      apiGet<ScheduleResponse>(`/api/v1/teachers/schedule`, {
        query: {
          teacher: teacherName,
          ...toQuery(params),
        },
      }),
    cacheOpts,
  )
}

// ─────────────────────────── Конфигурация ───────────────────────────

export function getCurrentWeekCount(cacheOpts: WithCacheOptions = {}) {
  return withCache(
    `schedule:week-count`,
    () => apiGet<WeekConfigurationResponse>(`/api/v1/configuration/week`),
    cacheOpts,
  )
}

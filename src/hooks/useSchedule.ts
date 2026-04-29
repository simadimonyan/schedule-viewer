import { ref, computed, watch, onMounted } from 'vue'
import type { ScheduleWeek, ScheduleItem, Lesson, ScheduleDay } from '../types/schedule'
import type { ScheduleParams } from '../api/schedule'
import { getGroupSchedule, getTeacherSchedule, getCurrentWeekCount } from '../api/schedule'
import type { ApiError } from '../api/client'
import {
  getCurrentWeekRange,
  getWeekRangeForDate,
  getWeekParity,
  formatDateISO,
  formatDateDDMM,
  parseTimePeriod,
  getDaysOfWeek,
} from '../utils/date'
import { EVENTS, trackGoal } from '../utils/analytics'

type Mode = 'group' | 'teacher'

interface UseScheduleOptions {
  mode: Mode
  id: string
}

function transformScheduleItems(items: ScheduleItem[]): Lesson[] {
  return items.map((item) => {
    const { startTime, endTime } = parseTimePeriod(item.timePeriod)
    return {
      ...item,
      startTime,
      endTime,
    }
  })
}

function groupLessonsByDay(lessons: Lesson[], weekStart: Date): ScheduleDay[] {
  const days = getDaysOfWeek(weekStart)
  const lessonsByDay = new Map<string, Lesson[]>()

  lessons.forEach((lesson) => {
    const dayKey = lesson.dayWeek
    if (!lessonsByDay.has(dayKey)) {
      lessonsByDay.set(dayKey, [])
    }
    lessonsByDay.get(dayKey)!.push(lesson)
  })

  return days.map((day) => ({
    date: formatDateISO(day.date),
    weekday: day.weekday,
    dayWeek: day.dayWeek,
    lessons: lessonsByDay.get(day.dayWeek) || [],
  }))
}

function extractLatestUpdatedAt(items: ScheduleItem[]): number | null {
  let latest: number | null = null
  for (const item of items) {
    const candidates: Array<number | null | undefined> = [
      item.group?.updatedAt,
      item.teacher?.updatedAt,
    ]
    for (const ts of candidates) {
      if (typeof ts === 'number' && ts > 0) {
        if (latest === null || ts > latest) latest = ts
      }
    }
  }
  return latest
}

function buildScheduleWeek(
  items: ScheduleItem[],
  weekCount: number,
  weekStart: Date,
  topLevelUpdatedAt?: number | null,
): ScheduleWeek {
  const lessons = transformScheduleItems(items)
  const days = groupLessonsByDay(lessons, weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  // Top-level updatedAt от backend'а в приоритете; иначе берём максимум
  // по объектам schedule.
  const updatedAt =
    typeof topLevelUpdatedAt === 'number' && topLevelUpdatedAt > 0
      ? topLevelUpdatedAt
      : extractLatestUpdatedAt(items)

  return {
    weekCount,
    startDate: formatDateISO(weekStart),
    endDate: formatDateISO(weekEnd),
    days,
    updatedAt,
  }
}

export function useSchedule(options: UseScheduleOptions) {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const week = ref<ScheduleWeek | null>(null)
  const selectedWeekCount = ref<number | null>(null)
  const serverWeekCount = ref<number | null>(null)
  /** Понедельник отображаемой недели (для навигации по датам) */
  const weekStartDate = ref<Date | null>(null)

  const label = computed(() => {
    if (!week.value) return ''
    const weekType = week.value.weekCount === 1 ? 'Нечётная' : 'Чётная'
    return `${weekType} неделя: ${week.value.startDate} — ${week.value.endDate}`
  })

  const serverWeekLabel = computed(() => {
    if (serverWeekCount.value === null) return ''
    return serverWeekCount.value === 1 ? 'Нечётная' : 'Чётная'
  })

  /* `firstLoadDone` нужен, чтобы на самом первом mount'е расписания
   * НЕ слать "Переключить расписание на первую/вторую неделю" —
   * это событие про явное переключение пользователем, а не про
   * первичную загрузку. Также используем его для одноразовой отметки
   * "Открыть расписание группы/преподавателя на сегодня/на неделю". */
  let firstLoadDone = false

  const load = async (weekCountOverride?: number, weekStartOverride?: Date) => {
    if (!options.id) return
    loading.value = true
    error.value = null

    try {
      const weekRange = weekStartOverride
        ? getWeekRangeForDate(weekStartOverride)
        : getCurrentWeekRange()
      weekStartDate.value = new Date(weekRange.start)

      let weekCount = weekCountOverride ?? selectedWeekCount.value
      if (weekCount === null) {
        // getCurrentWeekCount проходит через api-кеш (TTL 1 час),
        // поэтому повторные обращения за чётностью текущей недели
        // не уйдут в сеть.
        const config = await getCurrentWeekCount()
        weekCount = config.weekCount
        serverWeekCount.value = config.weekCount
      }
      if (weekStartOverride !== undefined) {
        weekCount = getWeekParity(weekRange.start)
      }
      selectedWeekCount.value = weekCount

      const params: ScheduleParams = {
        weekCount,
        date: formatDateDDMM(weekRange.start),
      }

      let response
      // FETCH-event "Получить ... из сервера" шлём только при
      // cache-miss — когда реально ушли в сеть. Кеш-хит — это не
      // запрос к серверу, и засорять метрику ложными "из сервера"
      // событиями не нужно.
      let scheduleFromCache = false
      const scheduleCacheOpts = {
        onCacheHit: () => (scheduleFromCache = true),
      }
      if (options.mode === 'group') {
        response = await getGroupSchedule(options.id, params, scheduleCacheOpts)
        if (!scheduleFromCache) {
          trackGoal(EVENTS.FETCH_GROUP_SCHEDULE, {
            groupName: options.id,
            weekCount,
          })
        }
      } else {
        response = await getTeacherSchedule(options.id, params, scheduleCacheOpts)
        if (!scheduleFromCache) {
          trackGoal(EVENTS.FETCH_TEACHER_SCHEDULE, {
            teacherName: options.id,
            weekCount,
          })
        }
      }

      week.value = buildScheduleWeek(
        response.schedule,
        weekCount,
        weekRange.start,
        response.updatedAt,
      )
      selectedWeekCount.value = weekCount

      // Первая успешная загрузка — отмечаем "Открыть расписание".
      // Для группы дополнительно проверяем, попадает ли сегодня в
      // отображаемую неделю (тогда событие "на сегодня"), иначе
      // только "на неделю". Мобильное приложение использует ту же
      // развилку.
      if (!firstLoadDone) {
        firstLoadDone = true

        const today = new Date()
        const todayISO = formatDateISO(today)
        const todayInWeek =
          week.value?.days?.some((d) => d.date === todayISO) ?? false

        if (options.mode === 'group') {
          trackGoal(EVENTS.OPEN_GROUP_WEEK, { groupName: options.id })
          if (todayInWeek) {
            trackGoal(EVENTS.OPEN_GROUP_TODAY, { groupName: options.id })
          }
        } else {
          trackGoal(EVENTS.OPEN_TEACHER_WEEK, { teacherName: options.id })
          if (todayInWeek) {
            trackGoal(EVENTS.OPEN_TEACHER_TODAY, { teacherName: options.id })
          }
        }
      }
    } catch (e) {
      const apiErr = e as ApiError
      error.value = apiErr.message || 'Не удалось загрузить расписание'
      week.value = null
    } finally {
      loading.value = false
    }
  }

  const changeWeek = async () => {
    const current = selectedWeekCount.value ?? 1
    const nextWeekCount = current === 1 ? 2 : 1

    // Семантика мобильного клиента: явное переключение чётности.
    // Шлём конкретное "первая/вторая" event, а если пользователь
    // переключился на чётность, отличную от server-side — это ещё и
    // "Локальная смена чётности недели без синхронизации".
    trackGoal(
      nextWeekCount === 1
        ? EVENTS.SWITCH_WEEK_FIRST
        : EVENTS.SWITCH_WEEK_SECOND,
    )
    if (
      serverWeekCount.value !== null &&
      nextWeekCount !== serverWeekCount.value
    ) {
      trackGoal(EVENTS.PARITY_LOCAL_TOGGLE, {
        from: current,
        to: nextWeekCount,
        serverWeekCount: serverWeekCount.value,
      })
    }

    await load(nextWeekCount, weekStartDate.value ?? undefined)
  }

  const goToPrevWeek = async () => {
    const start = weekStartDate.value ?? getCurrentWeekRange().start
    const prev = new Date(start)
    prev.setDate(prev.getDate() - 7)
    await load(selectedWeekCount.value ?? undefined, prev)
  }

  const goToNextWeek = async () => {
    const start = weekStartDate.value ?? getCurrentWeekRange().start
    const next = new Date(start)
    next.setDate(next.getDate() + 7)
    await load(selectedWeekCount.value ?? undefined, next)
  }

  const goToWeekByDate = async (date: Date) => {
    const { start } = getWeekRangeForDate(date)
    await load(selectedWeekCount.value ?? undefined, start)
  }

  onMounted(() => {
    void load()
  })

  watch(
    () => options.id,
    () => {
      selectedWeekCount.value = null
      // Новая сущность (другая группа/препод) — сбрасываем флаг,
      // чтобы события "Открыть расписание ..." сработали ещё раз.
      firstLoadDone = false
      void load()
    },
  )

  return {
    loading,
    error,
    week,
    label,
    serverWeekCount,
    serverWeekLabel,
    selectedWeekCount,
    weekStartDate,
    changeWeek,
    goToPrevWeek,
    goToNextWeek,
    goToWeekByDate,
  }
}


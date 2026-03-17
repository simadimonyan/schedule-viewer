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

function buildScheduleWeek(
  items: ScheduleItem[],
  weekCount: number,
  weekStart: Date,
): ScheduleWeek {
  const lessons = transformScheduleItems(items)
  const days = groupLessonsByDay(lessons, weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return {
    weekCount,
    startDate: formatDateISO(weekStart),
    endDate: formatDateISO(weekEnd),
    days,
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
      if (options.mode === 'group') {
        response = await getGroupSchedule(options.id, params)
      } else {
        response = await getTeacherSchedule(options.id, params)
      }

      week.value = buildScheduleWeek(response.schedule, weekCount, weekRange.start)
      selectedWeekCount.value = weekCount
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


<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { ScheduleWeek, Lesson } from '../../types/schedule'
import { formatDateFromISO } from '../../utils/date'

const props = withDefaults(
  defineProps<{
    week: ScheduleWeek
    /** Режим: на странице группы не показываем название группы, на странице препода — ФИО */
    mode?: 'group' | 'teacher'
  }>(),
  { mode: undefined }
)

const now = ref(new Date())
let ticker: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  ticker = setInterval(() => { now.value = new Date() }, 60_000)
})
onUnmounted(() => {
  if (ticker) clearInterval(ticker)
})

const todayDayWeek = computed(() => {
  const map = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
  return map[now.value.getDay()]!
})

// Получаем все уникальные временные слоты из всех дней
const allTimeSlots = computed(() => {
  const slots = new Set<string>()
  props.week.days.forEach((day) => {
    day.lessons.forEach((lesson) => {
      slots.add(lesson.timePeriod)
    })
  })
  return Array.from(slots).sort()
})

// Длительность слота в минутах и пикселей на минуту для высоты строки
const PX_PER_MIN = 2
function slotDurationMin(timeSlot: string): number {
  const [start, end] = timeSlot.split('-').map((s) => s?.trim().replace('.', ':'))
  const toM = (hhmm: string) => {
    const [h, m] = (hhmm || '').split(':').map((v) => Number(v))
    return (h || 0) * 60 + (m || 0)
  }
  return (toM(end || '') - toM(start || '')) || 90
}

const timeRange = computed(() => {
  if (!allTimeSlots.value.length) return { startMin: 0, endMin: 1440, totalMin: 1440 }
  const first = allTimeSlots.value[0]!
  const last = allTimeSlots.value[allTimeSlots.value.length - 1]!
  const toM = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map((v) => Number(v))
    return (h || 0) * 60 + (m || 0)
  }
  const [startStr] = first.split('-').map((s) => s?.trim().replace('.', ':'))
  const [, endStr] = last.split('-').map((s) => s?.trim().replace('.', ':'))
  const startMin = toM(startStr || '')
  const endMin = toM(endStr || '')
  return { startMin, endMin, totalMin: endMin - startMin }
})

const gridBodyHeight = computed(() => {
  return allTimeSlots.value.reduce((acc, slot) => acc + slotDurationMin(slot) * PX_PER_MIN, 0)
})

// Позиция красной линии «сейчас» (только для сегодня в пределах диапазона слотов)
const currentTimeLineStyle = computed(() => {
  const n = now.value
  const minutes = n.getHours() * 60 + n.getMinutes()
  const { startMin, endMin } = timeRange.value
  if (minutes < startMin || minutes > endMin) return null
  const topPx = (minutes - startMin) * PX_PER_MIN
  return { top: `${topPx}px` }
})

const showCurrentTimeLine = computed(() => {
  const isTodayInWeek = props.week.days.some((d) => d.dayWeek === todayDayWeek.value)
  return currentTimeLineStyle.value !== null && isTodayInWeek
})

// Получаем занятия для конкретного дня и времени
function getLessonForSlot(dayLessons: Lesson[], timePeriod: string): Lesson | undefined {
  return dayLessons.find((lesson) => lesson.timePeriod === timePeriod)
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => Number(v))
  return (h || 0) * 60 + (m || 0)
}

function isCurrentLesson(dayWeek: string, lesson?: Lesson): boolean {
  if (!lesson) return false
  if (dayWeek !== todayDayWeek.value) return false
  const n = now.value
  const minutes = n.getHours() * 60 + n.getMinutes()
  const start = toMinutes(lesson.startTime)
  const end = toMinutes(lesson.endTime)
  return minutes >= start && minutes <= end
}
</script>

<template>
  <div class="grid">
    <div class="grid-header">
      <div class="grid-cell time-col">Время</div>
      <div
        v-for="day in week.days"
        :key="day.date"
        class="grid-cell day-col"
        :class="{ today: day.dayWeek === todayDayWeek }"
      >
        <div class="day-name">
          {{ day.dayWeek }}
        </div>
        <div class="day-date">
          {{ formatDateFromISO(day.date) }}
        </div>
      </div>
    </div>

    <div class="grid-body" :style="{ minHeight: gridBodyHeight + 'px' }">
      <!-- Красная линия текущего времени (только сегодня) -->
      <div
        v-if="showCurrentTimeLine && currentTimeLineStyle"
        class="current-time-line"
        :style="currentTimeLineStyle"
        aria-hidden="true"
      >
        <span class="current-time-dot" />
      </div>

      <div
        v-for="timeSlot in allTimeSlots"
        :key="timeSlot"
        class="grid-row"
        :style="{ minHeight: slotDurationMin(timeSlot) * PX_PER_MIN + 'px' }"
      >
        <div class="grid-cell time-col">
          {{ timeSlot }}
        </div>

        <div
          v-for="day in week.days"
          :key="day.date"
          class="grid-cell lesson-cell"
          :class="{ today: day.dayWeek === todayDayWeek }"
        >
          <template v-if="getLessonForSlot(day.lessons, timeSlot)">
            <div
              class="lesson card"
              :class="{ current: isCurrentLesson(day.dayWeek, getLessonForSlot(day.lessons, timeSlot)) }"
            >
              <div class="lesson-chips">
                <span
                  v-if="getLessonForSlot(day.lessons, timeSlot)?.lessonType"
                  class="chip chip-type"
                >
                  {{ getLessonForSlot(day.lessons, timeSlot)?.lessonType }}
                </span>
                <span
                  v-if="getLessonForSlot(day.lessons, timeSlot)?.auditory"
                  class="chip chip-auditory"
                >
                  {{ getLessonForSlot(day.lessons, timeSlot)?.auditory }}
                </span>
              </div>
              <div class="lesson-subject">
                {{ getLessonForSlot(day.lessons, timeSlot)?.lessonName }}
              </div>
              <div
                v-if="mode !== 'teacher' && getLessonForSlot(day.lessons, timeSlot)?.teacher"
                class="lesson-teacher"
              >
                {{ getLessonForSlot(day.lessons, timeSlot)?.teacher?.label }}
              </div>
              <div
                v-if="mode !== 'group' && getLessonForSlot(day.lessons, timeSlot)?.group"
                class="lesson-group"
              >
                {{ getLessonForSlot(day.lessons, timeSlot)?.group?.name }}
              </div>
            </div>
          </template>
        <div
          v-else
          class="lesson empty"
        />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  overflow: auto;
  background: var(--surface);
  max-height: calc(100vh - 10rem);
}

.grid-body {
  position: relative;
}

.current-time-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #e53935;
  pointer-events: none;
  z-index: 2;
  display: flex;
  align-items: center;
}

.current-time-dot {
  position: absolute;
  left: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e53935;
  border: 2px solid var(--surface);
  box-shadow: 0 0 0 1px #e53935;
  transform: translate(-50%, -50%);
}

.grid-header,
.grid-row {
  display: grid;
  grid-template-columns: minmax(90px, 0.7fr) repeat(7, minmax(120px, 1fr));
  gap: 0;
}

.grid-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--surface);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 1px 0 0 rgba(148, 163, 184, 0.1);
}

.grid-cell {
  padding: 0.5rem 0.6rem;
  font-size: 0.78rem;
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.grid-cell:last-child {
  border-right: none;
}

.grid-header .grid-cell {
  font-weight: 500;
  text-align: center;
}

.grid-header .grid-cell.day-col,
.grid-header .grid-cell.time-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.time-col {
  background: transparent;
}

.day-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f172a;
}

.day-date {
  margin-top: 0.12rem;
  font-size: 0.7rem;
  color: #64748b;
}

.lesson-cell {
  padding: 0.35rem;
  min-height: 3rem;
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.lesson-cell:last-child {
  border-right: none;
}

.lesson {
  border-radius: 0.6rem;
  min-height: 3rem;
}

.lesson.card {
  position: relative;
  padding: 0.6rem 0.85rem 0.6rem 1.35rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.lesson.card:hover {
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  border-color: rgba(148, 163, 184, 0.18);
}

.lesson.card::before {
  content: '';
  position: absolute;
  left: 0.5rem;
  top: 50%;
  width: 5px;
  height: 68%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.75), rgba(29, 78, 216, 0.7));
  box-shadow: none;
  transform: translateY(-50%);
}

.lesson-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.4rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 500;
  line-height: 1.2;
}

.chip-time {
  background: rgba(148, 163, 184, 0.25);
  color: var(--text);
}

.chip-type {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.chip-auditory {
  background: rgba(15, 23, 42, 0.04);
  color: var(--text);
}

.lesson.current {
  border-color: var(--primaryBorder);
  box-shadow: 0 0 0 3px var(--primarySoft);
}

.lesson.empty {
  border: none;
  background: transparent;
  min-height: 3rem;
}

.lesson-subject {
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 1.25;
}

.lesson-teacher {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--text);
}

.lesson-group {
  margin-top: 0.1rem;
  font-size: 0.7rem;
  color: var(--text);
}

.today {
  background: rgba(37, 99, 235, 0.05);
}

@media (max-width: 1023px) {
  .grid-header,
  .grid-row {
    grid-template-columns: minmax(70px, 0.7fr) repeat(7, minmax(110px, 1fr));
  }
}
</style>


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

function toISODateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayISO = computed(() => toISODateLocal(now.value))

function isTodayDate(iso: string): boolean {
  return iso === todayISO.value
}

const displayedDays = computed(() => {
  return props.week.days.filter((d) => d.dayWeek !== 'Воскресенье')
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

function splitTimeSlot(timeSlot: string): { start: string; end: string } {
  const [start, end] = timeSlot.split('-').map((s) => s?.trim().replace('.', ':'))
  return { start: start || '', end: end || '' }
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
  const isTodayInWeek = displayedDays.value.some((d) => isTodayDate(d.date))
  return currentTimeLineStyle.value !== null && isTodayInWeek
})

const todayIndex = computed(() => {
  return displayedDays.value.findIndex((d) => isTodayDate(d.date))
})

// Получаем занятия для конкретного дня и времени
function getLessonForSlot(dayLessons: Lesson[], timePeriod: string): Lesson | undefined {
  return dayLessons.find((lesson) => lesson.timePeriod === timePeriod)
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => Number(v))
  return (h || 0) * 60 + (m || 0)
}

function isCurrentLesson(dayISO: string, lesson?: Lesson): boolean {
  if (!lesson) return false
  if (!isTodayDate(dayISO)) return false
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
      <div class="grid-cell meta-col">
        <span class="meta-head">
          <span class="pair-label">№</span>
          <span class="time-label">Время</span>
        </span>
      </div>
      <div
        v-for="day in displayedDays"
        :key="day.date"
        class="grid-cell day-col"
        :class="{ today: isTodayDate(day.date) }"
      >
        <div class="day-head">
          <span class="day-name">{{ day.dayWeek }}</span>
          <span class="day-date">{{ formatDateFromISO(day.date) }}</span>
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
        <div class="current-time-seg meta-col" />
        <div
          v-for="(day, idx) in displayedDays"
          :key="day.date"
          class="current-time-seg"
          :class="{ today: idx === todayIndex }"
        >
          <span v-if="idx === todayIndex" class="current-time-dot" />
        </div>
      </div>

      <div
        v-for="(timeSlot, slotIdx) in allTimeSlots"
        :key="timeSlot"
        class="grid-row-group"
      >
        <div
          class="grid-row"
          :style="{ minHeight: slotDurationMin(timeSlot) * PX_PER_MIN + 'px' }"
        >
          <div class="grid-cell meta-col">
            <div class="pair-num">{{ slotIdx + 1 }}</div>
            <div class="time-stack">
              <div class="time-start">{{ splitTimeSlot(timeSlot).start }}</div>
              <div class="time-end">{{ splitTimeSlot(timeSlot).end }}</div>
            </div>
          </div>

          <div
            v-for="day in displayedDays"
            :key="day.date"
            class="grid-cell lesson-cell"
            :class="{ today: isTodayDate(day.date) }"
          >
            <template v-if="getLessonForSlot(day.lessons, timeSlot)">
              <div
                class="lesson card"
                :class="{ current: isCurrentLesson(day.date, getLessonForSlot(day.lessons, timeSlot)) }"
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

        <div
          v-if="slotIdx !== allTimeSlots.length - 1"
          class="break-row"
          aria-hidden="true"
        >
          <div class="grid-cell meta-col break-meta">
            <span class="break-label">Перемена</span>
          </div>
          <div
            v-for="day in displayedDays"
            :key="day.date + '_break_' + slotIdx"
            class="grid-cell break-cell"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  overflow: visible;
  background: var(--surface);
  max-height: none;
  --meta-col-width: 112px;
  --day-col-min: 120px;
}

.grid-body {
  position: relative;
}

.current-time-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  pointer-events: none;
  z-index: 2;
  display: grid;
  grid-template-columns: var(--meta-col-width) repeat(6, minmax(var(--day-col-min), 1fr));
  align-items: center;
}

.current-time-seg {
  position: relative;
  height: 0;
  border-top: 2px dashed rgba(15, 23, 42, 0.12);
}

.current-time-seg.today {
  border-top-style: solid;
  border-top-color: #e53935;
}

.current-time-dot {
  position: absolute;
  left: 0;
  top: 0;
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
  grid-template-columns: var(--meta-col-width) repeat(6, minmax(var(--day-col-min), 1fr));
  gap: 0;
}

.break-row {
  display: grid;
  grid-template-columns: var(--meta-col-width) repeat(6, minmax(var(--day-col-min), 1fr));
  gap: 0;
  height: 46px;
  align-items: stretch;
}

.grid-row-group {
  width: 100%;
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

.grid-header .grid-cell.day-col {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.day-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.meta-col {
  background: transparent;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  white-space: nowrap;
}

.grid-row .meta-col {
  align-items: flex-start;
  padding-top: 0.35rem;
}

.grid-header .meta-col {
  align-items: center;
}

.meta-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.pair-label,
.time-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text);
}

.grid-cell.meta-col {
  padding-left: 0.25rem;
  padding-right: 0.25rem;
  font-size: 0.72rem;
}

.pair-num {
  width: 28px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.02);
  font-weight: 700;
  font-size: 0.72rem;
  color: #0f172a;
  flex: 0 0 auto;
}

.time-stack {
  flex: 1;
  min-width: 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.grid-row .time-stack {
  justify-content: flex-start;
}

.time-start,
.time-end {
  line-height: 1.05;
}

.time-end {
  margin-top: 2px;
  opacity: 0.75;
}

.break-meta {
  justify-content: center;
}

.break-label {
  width: 100%;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 0.65rem;
  border-radius: 9999px;
  border: 1px dashed var(--primaryBorder);
  background: rgba(255, 255, 255, 0.7);
}

.break-row {
  align-items: center;
}

.break-row .grid-cell {
  padding: 0.3rem 0.35rem;
  /* убираем обычную сетку у строки перемены */
  border-right: none;
  border-bottom: none;
  background: rgba(15, 23, 42, 0.01);
  height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.break-row .grid-cell {
  border-bottom: 1px dashed var(--primaryBorder);
  border-top: 1px dashed var(--primaryBorder);
}

.break-row .grid-cell:first-child {
  border-left: 1px dashed var(--primaryBorder);
}

.break-row .grid-cell:last-child {
  border-right: 1px dashed var(--primaryBorder);
}

.break-row .break-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primarySoft);
}

.day-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f172a;
  text-align: left;
}

.day-date {
  font-size: 0.7rem;
  color: #64748b;
  text-align: right;
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
  background: var(--primary);
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
  background: var(--primarySoft);
  color: var(--primary);
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

.grid-cell.today {
  background: var(--primarySoft);
}

@media (max-width: 1023px) {
  .grid {
    --meta-col-width: 96px;
    --day-col-min: 110px;
  }

  .current-time-line,
  .grid-header,
  .grid-row {
    grid-template-columns: var(--meta-col-width) repeat(6, minmax(var(--day-col-min), 1fr));
  }

  .break-row {
    grid-template-columns: var(--meta-col-width) repeat(6, minmax(var(--day-col-min), 1fr));
  }
}
</style>


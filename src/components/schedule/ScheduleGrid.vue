<script setup lang="ts">
import { computed } from 'vue'
import type { ScheduleWeek, Lesson } from '../../types/schedule'

const props = defineProps<{
  week: ScheduleWeek
}>()

const now = computed(() => new Date())

const todayDayWeek = computed(() => {
  // JS: 0=Вс ... 6=Сб
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
          {{ day.date }}
        </div>
      </div>
    </div>

    <div class="grid-body">
      <div
        v-for="timeSlot in allTimeSlots"
        :key="timeSlot"
        class="grid-row"
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
          <div
            v-if="getLessonForSlot(day.lessons, timeSlot)"
            class="lesson"
            :class="{ current: isCurrentLesson(day.dayWeek, getLessonForSlot(day.lessons, timeSlot)) }"
          >
            <div class="lesson-subject">
              {{ getLessonForSlot(day.lessons, timeSlot)?.lessonName }}
            </div>
            <div class="lesson-meta">
              <span>
                {{ getLessonForSlot(day.lessons, timeSlot)?.startTime }} — {{ getLessonForSlot(day.lessons, timeSlot)?.endTime }}
              </span>
              <span v-if="getLessonForSlot(day.lessons, timeSlot)?.auditory">
                · {{ getLessonForSlot(day.lessons, timeSlot)?.auditory }}
              </span>
            </div>
            <div class="lesson-type">
              {{ getLessonForSlot(day.lessons, timeSlot)?.lessonType }}
            </div>
            <div
              v-if="getLessonForSlot(day.lessons, timeSlot)?.teacher"
              class="lesson-teacher"
            >
              {{ getLessonForSlot(day.lessons, timeSlot)?.teacher?.label }}
            </div>
            <div
              v-if="getLessonForSlot(day.lessons, timeSlot)?.group"
              class="lesson-group"
            >
              {{ getLessonForSlot(day.lessons, timeSlot)?.group?.name }}
            </div>
          </div>
          <div
            v-else
            class="lesson empty"
          >
            —
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  border-radius: var(--radiusLg);
  border: 1px solid var(--border);
  overflow: auto;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.grid-header,
.grid-row {
  display: grid;
  grid-template-columns: minmax(90px, 0.7fr) repeat(7, minmax(120px, 1fr));
}

.grid-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface);
}

.grid-cell {
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
  padding: 0.55rem 0.55rem;
  font-size: 0.8rem;
}

.grid-header .grid-cell {
  border-bottom-color: var(--border);
  font-weight: 500;
}

.time-col {
  background: var(--surface);
}

.day-name {
  font-size: 0.85rem;
}

.day-date {
  margin-top: 0.1rem;
  font-size: 0.7rem;
  color: var(--muted);
}

.lesson-cell {
  padding: 0.25rem;
}

.lesson {
  border-radius: 0.6rem;
  padding: 0.45rem 0.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  min-height: 3rem;
}

.lesson.current {
  border-color: var(--primaryBorder);
  box-shadow: 0 0 0 3px var(--primarySoft);
}

.lesson.empty {
  border-style: dashed;
  text-align: center;
  color: var(--muted);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lesson-subject {
  font-size: 0.85rem;
  font-weight: 500;
}

.lesson-meta {
  margin-top: 0.15rem;
  font-size: 0.7rem;
  color: var(--muted);
}

.lesson-type {
  margin-top: 0.15rem;
  font-size: 0.7rem;
  color: var(--primary);
}

.lesson-teacher {
  margin-top: 0.15rem;
  font-size: 0.75rem;
}

.lesson-group {
  margin-top: 0.1rem;
  font-size: 0.7rem;
  color: var(--muted);
}

.today {
  background: rgba(13, 128, 255, 0.06);
}

@media (max-width: 1023px) {
  .grid-header,
  .grid-row {
    grid-template-columns: minmax(70px, 0.7fr) repeat(7, minmax(110px, 1fr));
  }
}
</style>


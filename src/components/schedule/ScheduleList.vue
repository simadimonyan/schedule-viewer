<script setup lang="ts">
import { computed } from 'vue'
import type { ScheduleWeek } from '../../types/schedule'

const props = defineProps<{
  week: ScheduleWeek
}>()

const now = computed(() => new Date())
const todayDayWeek = computed(() => {
  const map = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
  return map[now.value.getDay()]!
})

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => Number(v))
  return (h || 0) * 60 + (m || 0)
}

function isCurrentLesson(dayWeek: string, startTime: string, endTime: string): boolean {
  if (dayWeek !== todayDayWeek.value) return false
  const n = now.value
  const minutes = n.getHours() * 60 + n.getMinutes()
  return minutes >= toMinutes(startTime) && minutes <= toMinutes(endTime)
}
</script>

<template>
  <div class="list">
    <div
      v-for="day in week.days"
      :key="day.date"
      class="day"
      :class="{ today: day.dayWeek === todayDayWeek }"
    >
      <div class="day-header">
        <div class="day-title">
          <span class="day-name">
            {{ day.dayWeek }}
          </span>
          <span class="day-date">
            {{ day.date }}
          </span>
        </div>
      </div>

      <div class="lessons">
        <div
          v-if="!day.lessons.length"
          class="lesson empty"
        >
          Занятий нет
        </div>
        <article
          v-for="lesson in day.lessons"
          :key="lesson.id"
          class="lesson"
          :class="{ current: isCurrentLesson(day.dayWeek, lesson.startTime, lesson.endTime) }"
        >
          <div class="time">
            {{ lesson.timePeriod }}
          </div>
          <div class="subject">
            {{ lesson.lessonName }}
          </div>
          <div class="meta">
            <span class="lesson-type">
              {{ lesson.lessonType }}
            </span>
            <span v-if="lesson.auditory">
              · {{ lesson.auditory }}
            </span>
            <span v-if="lesson.teacher">
              · {{ lesson.teacher.label }}
            </span>
          </div>
          <div
            v-if="lesson.group"
            class="group"
          >
            {{ lesson.group.name }}
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.day {
  border-radius: var(--radiusLg);
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.day-header {
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--border);
}

.day-title {
  display: flex;
  gap: 0.35rem;
  align-items: baseline;
}

.day-name {
  font-size: 0.85rem;
  font-weight: 500;
}

.day-date {
  font-size: 0.7rem;
  color: var(--text);
}

.lessons {
  padding: 0.45rem 0.55rem 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.lesson {
  border-radius: 0.6rem;
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 0.45rem 0.55rem;
  font-size: 0.8rem;
}

.lesson.current {
  border-color: var(--primaryBorder);
  box-shadow: 0 0 0 3px var(--primarySoft);
}

.lesson.empty {
  text-align: center;
  color: var(--text);
  border-style: dashed;
}

.time {
  font-size: 0.78rem;
  color: var(--text);
}

.subject {
  margin-top: 0.1rem;
  font-weight: 500;
}

.meta {
  margin-top: 0.1rem;
  font-size: 0.75rem;
  color: var(--text);
}

.lesson-type {
  color: var(--primary);
}

.group {
  margin-top: 0.1rem;
  font-size: 0.7rem;
  color: var(--text);
}

.today {
  border-color: var(--primaryBorder);
}
</style>


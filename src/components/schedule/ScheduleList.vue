<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ScheduleWeek, Lesson } from '../../types/schedule'
import { formatDateFromISO } from '../../utils/date'
import { combineLessons, type CombinedLesson } from '../../utils/lessons'

const props = defineProps<{
  week: ScheduleWeek
  mode?: 'group' | 'teacher'
}>()

const emit = defineEmits<{
  (e: 'open-lesson', payload: { lesson: Lesson; dayDate: string }): void
}>()

function onLessonClick(lesson: CombinedLesson, dayDate: string) {
  emit('open-lesson', { lesson, dayDate })
}

const now = ref(new Date())
let ticker: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  ticker = setInterval(() => {
    now.value = new Date()
  }, 60_000)
})

onUnmounted(() => {
  if (ticker) clearInterval(ticker)
})

const todayISO = computed(() => {
  const d = now.value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})

function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '').split(':').map((v) => Number(v))
  return (h || 0) * 60 + (m || 0)
}

function isCurrent(dateISO: string, lesson: Lesson): boolean {
  if (dateISO !== todayISO.value) return false
  const minutes = now.value.getHours() * 60 + now.value.getMinutes()
  return minutes >= toMinutes(lesson.startTime) && minutes <= toMinutes(lesson.endTime)
}

/* Объединяем дубликаты — для расписания препода это критично:
 * один и тот же предмет/время/аудитория с несколькими группами должен
 * показываться одной карточкой с перечислением групп. */
const combinedDays = computed(() =>
  props.week.days.map((d) => ({
    ...d,
    lessons: combineLessons(d.lessons),
  })),
)

function lessonTypeClass(type: string | undefined): string {
  if (!type) return 'type-lecture'
  const t = type.toLowerCase()
  if (t.includes('практик')) return 'type-practice'
  if (t.includes('лабор')) return 'type-lab'
  if (t.includes('экзамен') || t.includes('зачёт') || t.includes('зачет')) return 'type-exam'
  if (t.includes('вводн') || t.includes('установ') || t.includes('ознаком')) return 'type-intro'
  return 'type-lecture'
}

function splitTime(period: string): { s: string; e: string } {
  const [s, e] = period.split('-').map((x) => x.trim().replace('.', ':'))
  return { s: s || '', e: e || '' }
}

const visibleDays = computed(() =>
  combinedDays.value.filter((d) => d.lessons.length > 0),
)
</script>

<template>
  <div class="lv">
    <!-- Empty state: иллюстрация + заголовок + подсказка переключиться на
         другую неделю. Появляется когда на всю неделю нет ни одной пары. -->
    <div v-if="!visibleDays.length" class="lv-empty">
      <div class="lv-empty-illustration" aria-hidden="true">
        <svg viewBox="0 0 120 120" fill="none">
          <!-- Календарь -->
          <rect x="22" y="28" width="76" height="68" rx="10" fill="var(--ds-surface-soft)" stroke="var(--ds-border-strong)" stroke-width="1.5"/>
          <rect x="22" y="28" width="76" height="20" rx="10" fill="var(--ds-accent-soft)"/>
          <rect x="22" y="38" width="76" height="10" fill="var(--ds-accent-soft)"/>
          <line x1="22" y1="48" x2="98" y2="48" stroke="var(--ds-accent-border)" stroke-width="1.2"/>
          <line x1="38" y1="22" x2="38" y2="36" stroke="var(--ds-fg-soft)" stroke-width="3" stroke-linecap="round"/>
          <line x1="82" y1="22" x2="82" y2="36" stroke="var(--ds-fg-soft)" stroke-width="3" stroke-linecap="round"/>
          <!-- ZZZ — спящий календарь -->
          <text x="56" y="78" font-family="var(--ds-font-display)" font-size="22" font-weight="800" fill="var(--ds-fg-faint)" text-anchor="middle">Z z z</text>
          <!-- Decorative dots -->
          <circle cx="32" cy="60" r="2" fill="var(--ds-border-strong)"/>
          <circle cx="40" cy="60" r="2" fill="var(--ds-border-strong)"/>
          <circle cx="48" cy="60" r="2" fill="var(--ds-border-strong)"/>
          <circle cx="32" cy="88" r="2" fill="var(--ds-border-strong)"/>
          <circle cx="40" cy="88" r="2" fill="var(--ds-border-strong)"/>
        </svg>
      </div>
      <div class="lv-empty-title">Свободная неделя</div>
      <div class="lv-empty-text">
        На этой неделе занятий нет.<br />
        Попробуйте переключиться на другую неделю выше.
      </div>
    </div>

    <div
      v-for="day in visibleDays"
      :key="day.date"
      class="lv-section"
    >
      <div class="lv-day-hdr" :class="{ 'lv-day-today': day.date === todayISO }">
        <span v-if="day.date === todayISO" class="now-p" />
        <div class="lv-day-name">{{ day.dayWeek }}</div>
        <div class="lv-day-date">{{ formatDateFromISO(day.date) }}</div>
      </div>

      <article
        v-for="lesson in day.lessons"
        :key="lesson.id"
        class="lv-lesson"
        :class="[
          lessonTypeClass(lesson.lessonType),
          { cur: isCurrent(day.date, lesson) },
        ]"
        role="button"
        tabindex="0"
        @click="onLessonClick(lesson, day.date)"
        @keydown.enter="onLessonClick(lesson, day.date)"
        @keydown.space.prevent="onLessonClick(lesson, day.date)"
      >
        <div class="lv-time">
          <span>{{ splitTime(lesson.timePeriod).s }}</span>
          <span>{{ splitTime(lesson.timePeriod).e }}</span>
        </div>
        <div class="lv-body">
          <div v-if="isCurrent(day.date, lesson)" class="lc-now">
            <span class="now-p" />Идёт сейчас
          </div>
          <div class="lc-chips">
            <span v-if="lesson.lessonType" class="chip-t chip-type">{{ lesson.lessonType }}</span>
            <span v-if="lesson.auditory" class="chip-t chip-room">ауд. {{ lesson.auditory }}</span>
          </div>
          <div class="lc-name">{{ lesson.lessonName }}</div>
          <div v-if="mode !== 'teacher' && lesson.teacher" class="lc-teacher">
            {{ lesson.teacher.label }}
          </div>
          <!-- Все группы списком (объединённые при дублировании) -->
          <div v-if="mode !== 'group' && lesson.groups.length > 0" class="lc-teacher">
            {{ lesson.groups.map((g) => g.name).join(', ') }}
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.lv {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lv-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ─── Empty state — «Свободная неделя» ───
   Иллюстрация спящего календаря + заголовок + подсказка. */
.lv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 36px 24px 40px;
  gap: 14px;
  border: 1px dashed var(--ds-border-strong);
  border-radius: var(--r-xl);
  background: var(--ds-surface-soft);
  animation: lv-empty-in 0.32s var(--ease-out, ease);
}

.lv-empty-illustration {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.lv-empty-illustration svg {
  width: 100%;
  height: 100%;
  display: block;
  /* Subtle breathing animation для оживления */
  animation: lv-empty-float 4.5s ease-in-out infinite;
}

.lv-empty-title {
  font-family: var(--ds-font-display);
  font-size: 17px;
  font-weight: 800;
  color: var(--ds-fg);
  letter-spacing: -0.01em;
}

.lv-empty-text {
  font-size: 13px;
  line-height: 1.55;
  color: var(--ds-fg-soft);
  max-width: 280px;
}

@keyframes lv-empty-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes lv-empty-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lv-empty,
  .lv-empty-illustration svg {
    animation: none;
  }
}

/* ── Day header ── */
.lv-day-hdr {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: var(--r-md);
  background: var(--ds-surface-soft);
  border: 1px solid var(--ds-border);
}

.lv-day-hdr.lv-day-today {
  border-color: var(--ds-accent-border);
  background: var(--ds-accent-soft);
}

.lv-day-name {
  font-family: var(--ds-font-display);
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ds-fg);
}

.lv-day-today .lv-day-name {
  color: var(--ds-accent);
}

.lv-day-date {
  font-size: 11px;
  color: var(--ds-fg-soft);
  font-family: var(--ds-font-mono);
  margin-left: auto;
}

/* ── Lesson row ── */
.lv-lesson {
  display: flex;
  gap: 10px;
  padding: 10px 14px 10px 18px;
  border-radius: var(--r-lg);
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  position: relative;
  cursor: pointer;
  transition: all 0.15s;
}

.lv-lesson:hover {
  border-color: var(--ds-border-strong);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.lv-lesson::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 10px;
  bottom: 10px;
  width: 4px;
  border-radius: 4px;
  background: var(--lesson-lecture);
}

.lv-lesson.type-practice::before { background: var(--lesson-practice); }
.lv-lesson.type-lab::before      { background: var(--lesson-lab); }
.lv-lesson.type-exam::before     { background: var(--lesson-exam); }
.lv-lesson.type-intro::before    { background: var(--lesson-intro); }

.lv-lesson.cur {
  border-color: var(--ds-accent-border);
  box-shadow: 0 0 0 3px var(--ds-accent-soft), var(--shadow-sm);
}

.lv-time {
  font-family: var(--ds-font-mono);
  font-size: 10.5px;
  color: var(--ds-fg-soft);
  width: 52px;
  flex-shrink: 0;
  padding-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.5;
}

.lv-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* ── Chips ── */
.lc-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.chip-t {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: var(--r-full);
  font-size: 9.5px;
  font-weight: 600;
}

.chip-type { background: var(--lesson-lecture-soft); color: var(--lesson-lecture); }
.type-practice .chip-type { background: var(--lesson-practice-soft); color: var(--lesson-practice); }
.type-lab .chip-type      { background: var(--lesson-lab-soft);      color: var(--lesson-lab); }
.type-exam .chip-type     { background: var(--lesson-exam-soft);     color: var(--lesson-exam); }
.type-intro .chip-type    { background: var(--lesson-intro-soft);    color: var(--lesson-intro); }

.chip-room { background: rgba(15, 23, 42, 0.05); color: var(--ds-fg-soft); }
[data-theme="dark"] .chip-room { background: rgba(255, 255, 255, 0.07); }

.lc-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ds-fg);
  line-height: 1.35;
}

.lc-teacher {
  font-size: 11px;
  color: var(--ds-fg-soft);
  line-height: 1.3;
}

.lc-now {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--red);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.now-p {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  animation: pulse 1.8s infinite;
  display: inline-block;
  flex-shrink: 0;
}

@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  70%  { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

/* ─── Mobile: компактные, чистые карточки занятий по design-system ─── */
@media (max-width: 768px) {
  .lv {
    gap: 20px;
  }

  /* День: чистый заголовок без рамок, тонкий divider, дата справа в pill-стиле */
  .lv-day-hdr {
    padding: 0 0 10px;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--ds-border);
    border-radius: 0;
    margin-bottom: 10px;
  }

  .lv-day-hdr.lv-day-today {
    background: transparent;
    border-bottom-color: var(--ds-accent-border);
  }

  .lv-day-name {
    font-family: var(--ds-font-display);
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .lv-day-today .lv-day-name {
    color: var(--ds-accent);
  }

  .lv-day-date {
    font-size: 11.5px;
    color: var(--ds-fg-soft);
    background: var(--ds-surface-sunk);
    padding: 4px 10px;
    border-radius: var(--r-full);
    font-family: var(--ds-font-mono);
    font-weight: 500;
  }

  .lv-day-today .lv-day-date {
    background: var(--ds-accent-soft);
    color: var(--ds-accent);
  }

  /* Карточка: корешок-таблетка внутри (как в desktop-prototype) —
     отступленный от краёв rounded-стрип, а не плоская левая граница.
     Карточка имеет отступ слева, чтобы освободить место под корешок. */
  .lv-lesson {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    /* Левый padding 18px = 6px (отступ от края) + 4px (ширина корешка) +
       8px (отступ до контента) */
    padding: 14px 16px 14px 18px;
    background: var(--ds-surface);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-xs);
    border: 1px solid var(--ds-border);
    transition: box-shadow 0.18s var(--ease-out, ease),
      border-color 0.15s, transform 0.18s var(--ease-out, ease);
    width: 100%;
    box-sizing: border-box;
    position: relative;
  }

  /* Корешок — rounded-pill стрип, отступленный от верха/низа карточки */
  .lv-lesson::before {
    display: block;
    content: '';
    position: absolute;
    left: 6px;
    top: 10px;
    bottom: 10px;
    width: 4px;
    border-radius: 4px;
    background: var(--ds-accent); /* default = лекция (синий) */
    transition: background 0.15s ease;
  }

  /* Цвета корешка по типу занятия */
  .lv-lesson.type-practice::before { background: var(--green); }
  .lv-lesson.type-lab::before      { background: var(--amber); }
  .lv-lesson.type-exam::before     { background: var(--red); }
  .lv-lesson.type-intro::before    { background: var(--violet); }

  .lv-lesson:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--ds-border-strong);
    transform: translateY(-1px);
  }

  /* Hover активного состояния — корешок чуть «толще» */
  .lv-lesson:hover::before {
    width: 5px;
    left: 5px;
  }
  /* Цвет корешка при hover не сбрасывается (наследуется from base rules) */

  .lv-lesson:active {
    transform: scale(0.98);
  }

  /* Подсветка «сейчас» */
  .lv-lesson.cur {
    border-color: var(--ds-accent-border);
    box-shadow: 0 0 0 3px var(--ds-accent-soft), var(--shadow-sm);
  }

  /* Верхняя строка карточки: время слева | chips справа.
     Используем всё пространство в ширину. */
  .lv-time {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0;
    width: auto;
    padding: 0;
    background: transparent;
    font-family: var(--ds-font-mono);
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ds-fg);
    line-height: 1;
  }

  .lv-time span {
    color: var(--ds-fg);
  }

  .lv-time span:first-child::after {
    content: '–';
    margin: 0 5px;
    color: var(--ds-fg-faint);
  }

  .lv-time span:last-child {
    color: var(--ds-fg-soft);
  }

  /* Body заполняет всю ширину карточки */
  .lv-body {
    flex: 1;
    min-width: 0;
    width: 100%;
    display: grid;
    grid-template-rows: auto auto auto;
    gap: 6px;
  }

  /* Заголовок ряда: чипы и аудитория распределены space-between */
  .lc-chips {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    flex-wrap: wrap;
    width: 100%;
  }

  /* Аудитория — выталкиваем вправо чтобы использовать всё пространство */
  .lc-chips .chip-room {
    margin-left: auto;
  }

  .chip-t {
    padding: 3px 9px;
    font-size: 10.5px;
    font-weight: 600;
    border-radius: var(--r-full);
    line-height: 1;
    white-space: nowrap;
  }

  /* Заголовок предмета — крупно, на всю ширину, перенос если длинный */
  .lc-name {
    font-family: var(--ds-font-display);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.005em;
    line-height: 1.3;
    color: var(--ds-fg);
    width: 100%;
    overflow-wrap: anywhere;
  }

  /* Преподаватель — занимает всю ширину */
  .lc-teacher {
    font-size: 12px;
    color: var(--ds-fg-soft);
    line-height: 1.35;
    white-space: normal;
    width: 100%;
    overflow-wrap: anywhere;
  }

  .lc-now {
    font-size: 9.5px;
    margin-bottom: 2px;
  }
}
</style>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { ScheduleWeek, Lesson } from '../../types/schedule'
import { formatDateFromISO } from '../../utils/date'
import { combineLessons, type CombinedLesson } from '../../utils/lessons'

const props = withDefaults(
  defineProps<{
    week: ScheduleWeek
    /** Режим: на странице группы не показываем название группы, на странице препода — ФИО */
    mode?: 'group' | 'teacher'
  }>(),
  { mode: undefined },
)

const emit = defineEmits<{
  (e: 'open-lesson', payload: { lesson: Lesson; dayDate: string }): void
}>()

/* ── Constants ──
 * Фиксированная высота строк (как в прототипе): пара = 84px, перерыв = 32px.
 * Раньше высота вычислялась из длительности слота × 2px/мин (т.е. 180px на 90-минутную пару) —
 * это ломало позицию красной линии «сейчас» и делало таблицу неоправданно громоздкой. */
const ROW_PX = 84
const BREAK_PX = 32

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

/* Каждый день дополнительно агрегируем — объединяем дубликаты-уроки
 * (одинаковое время / предмет / аудитория / преподаватель), чтобы
 * для слота показывался один CombinedLesson со списком групп. */
const displayedDays = computed(() =>
  props.week.days
    .filter((d) => d.dayWeek !== 'Воскресенье')
    .map((d) => ({ ...d, lessons: combineLessons(d.lessons) })),
)

const allTimeSlots = computed(() => {
  const slots = new Set<string>()
  displayedDays.value.forEach((day) => {
    day.lessons.forEach((lesson) => {
      slots.add(lesson.timePeriod)
    })
  })
  return Array.from(slots).sort()
})

function splitTimeSlot(timeSlot: string): { start: string; end: string } {
  const [start, end] = timeSlot.split('-').map((s) => s?.trim().replace('.', ':'))
  return { start: start || '', end: end || '' }
}

function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '').split(':').map((v) => Number(v))
  return (h || 0) * 60 + (m || 0)
}

const gridBodyHeight = computed(() => {
  const n = allTimeSlots.value.length
  if (!n) return 0
  return n * ROW_PX + (n - 1) * BREAK_PX
})

/* Позиция красной линии «сейчас».
 * Идея: пробегаем по слотам, для каждого — если текущее время попадает в его интервал,
 * вычисляем долю проиденного и прибавляем к накопленному смещению. Между слотами
 * добавляем высоту перерыва. Если время вне диапазона слотов — линию не показываем. */
const currentTimeLineTop = computed<number | null>(() => {
  const slots = allTimeSlots.value
  if (!slots.length) return null
  const isTodayInWeek = displayedDays.value.some((d) => isTodayDate(d.date))
  if (!isTodayInWeek) return null

  const minutes = now.value.getHours() * 60 + now.value.getMinutes()
  let offset = 0
  for (let i = 0; i < slots.length; i++) {
    const { start, end } = splitTimeSlot(slots[i]!)
    const sM = toMinutes(start)
    const eM = toMinutes(end)
    if (minutes < sM) {
      // мы до начала этого слота → линия не рисуется
      return null
    }
    if (minutes >= sM && minutes <= eM) {
      const frac = (minutes - sM) / Math.max(1, eM - sM)
      return offset + frac * ROW_PX
    }
    offset += ROW_PX
    if (i < slots.length - 1) offset += BREAK_PX
  }
  return null
})

const todayIndex = computed(() => displayedDays.value.findIndex((d) => isTodayDate(d.date)))

function getLessonForSlot(dayLessons: CombinedLesson[], timePeriod: string): CombinedLesson | undefined {
  return dayLessons.find((lesson) => lesson.timePeriod === timePeriod)
}

function isCurrentLesson(dayISO: string, lesson?: Lesson): boolean {
  if (!lesson) return false
  if (!isTodayDate(dayISO)) return false
  const minutes = now.value.getHours() * 60 + now.value.getMinutes()
  const start = toMinutes(lesson.startTime)
  const end = toMinutes(lesson.endTime)
  return minutes >= start && minutes <= end
}

function lessonTypeClass(type: string | undefined): string {
  if (!type) return 'type-lecture'
  const t = type.toLowerCase()
  if (t.includes('практик')) return 'type-practice'
  if (t.includes('лабор')) return 'type-lab'
  if (t.includes('экзамен') || t.includes('зачёт') || t.includes('зачет')) return 'type-exam'
  if (t.includes('вводн') || t.includes('установ') || t.includes('ознаком')) return 'type-intro'
  return 'type-lecture'
}

function onLessonClick(lesson: Lesson, dayDate: string) {
  emit('open-lesson', { lesson, dayDate })
}
</script>

<template>
  <div class="sg-wrap">
    <!-- Header -->
    <div class="sg-hdr">
      <div class="sg-hdr-meta">
        <span class="sg-hdr-meta-label">Время</span>
      </div>
      <div
        v-for="day in displayedDays"
        :key="day.date"
        class="sg-hdr-cell"
        :class="{ 'today-hdr': isTodayDate(day.date) }"
      >
        <div class="day-n">{{ day.dayWeek }}</div>
        <div class="day-d">{{ formatDateFromISO(day.date) }}</div>
        <div v-if="isTodayDate(day.date)" class="today-dot" />
      </div>
    </div>

    <!-- Empty state — нет ни одного слота на неделю.
         Показываем красивую заглушку с иллюстрацией календаря. -->
    <div v-if="!allTimeSlots.length" class="sg-empty">
      <div class="sg-empty-illustration" aria-hidden="true">
        <svg viewBox="0 0 140 140" fill="none">
          <rect x="22" y="32" width="96" height="80" rx="12" fill="var(--ds-surface-soft)" stroke="var(--ds-border-strong)" stroke-width="1.5"/>
          <rect x="22" y="32" width="96" height="22" rx="12" fill="var(--ds-accent-soft)"/>
          <rect x="22" y="42" width="96" height="12" fill="var(--ds-accent-soft)"/>
          <line x1="22" y1="54" x2="118" y2="54" stroke="var(--ds-accent-border)" stroke-width="1.2"/>
          <line x1="42" y1="24" x2="42" y2="40" stroke="var(--ds-fg-soft)" stroke-width="3.2" stroke-linecap="round"/>
          <line x1="98" y1="24" x2="98" y2="40" stroke="var(--ds-fg-soft)" stroke-width="3.2" stroke-linecap="round"/>
          <text x="70" y="92" font-family="var(--ds-font-display)" font-size="26" font-weight="800" fill="var(--ds-fg-faint)" text-anchor="middle">Z z z</text>
          <circle cx="36" cy="68" r="2.2" fill="var(--ds-border-strong)"/>
          <circle cx="46" cy="68" r="2.2" fill="var(--ds-border-strong)"/>
          <circle cx="56" cy="68" r="2.2" fill="var(--ds-border-strong)"/>
          <circle cx="36" cy="102" r="2.2" fill="var(--ds-border-strong)"/>
          <circle cx="46" cy="102" r="2.2" fill="var(--ds-border-strong)"/>
        </svg>
      </div>
      <div class="sg-empty-title">Свободная неделя</div>
      <div class="sg-empty-text">
        На этой неделе занятий нет.<br />
        Попробуйте переключиться на другую неделю выше.
      </div>
    </div>

    <div v-else class="sg-body" :style="{ minHeight: gridBodyHeight + 'px' }">
      <!-- Current time line -->
      <div
        v-if="currentTimeLineTop !== null"
        class="tl"
        :style="{ top: currentTimeLineTop + 'px' }"
        aria-hidden="true"
      >
        <div class="tl-m" />
        <div
          v-for="(day, idx) in displayedDays"
          :key="day.date"
          class="tl-c"
          :class="{ today: idx === todayIndex }"
        >
          <span v-if="idx === todayIndex" class="tl-dot" />
        </div>
      </div>

      <template v-for="(timeSlot, slotIdx) in allTimeSlots" :key="timeSlot">
        <!-- Lesson row -->
        <div class="sg-row" :style="{ height: ROW_PX + 'px' }">
          <div class="sg-meta">
            <div class="pair-num">{{ slotIdx + 1 }}</div>
            <div class="time-stk">
              <div class="ts">{{ splitTimeSlot(timeSlot).start }}</div>
              <div class="te">{{ splitTimeSlot(timeSlot).end }}</div>
            </div>
          </div>

          <div
            v-for="day in displayedDays"
            :key="day.date"
            class="sg-cell"
            :class="{ 'today-col': isTodayDate(day.date) }"
          >
            <button
              v-if="getLessonForSlot(day.lessons, timeSlot)"
              type="button"
              class="lc"
              :class="[
                { cur: isCurrentLesson(day.date, getLessonForSlot(day.lessons, timeSlot)) },
                lessonTypeClass(getLessonForSlot(day.lessons, timeSlot)?.lessonType),
              ]"
              @click="onLessonClick(getLessonForSlot(day.lessons, timeSlot)!, day.date)"
            >
              <div v-if="isCurrentLesson(day.date, getLessonForSlot(day.lessons, timeSlot))" class="lc-now">
                <span class="now-p" />Сейчас
              </div>
              <div class="lc-chips">
                <span v-if="getLessonForSlot(day.lessons, timeSlot)?.lessonType" class="chip-t chip-type">
                  {{ getLessonForSlot(day.lessons, timeSlot)?.lessonType }}
                </span>
                <span v-if="getLessonForSlot(day.lessons, timeSlot)?.auditory" class="chip-t chip-room">
                  ауд. {{ getLessonForSlot(day.lessons, timeSlot)?.auditory }}
                </span>
              </div>
              <div class="lc-name">{{ getLessonForSlot(day.lessons, timeSlot)?.lessonName }}</div>
              <div v-if="mode !== 'teacher' && getLessonForSlot(day.lessons, timeSlot)?.teacher" class="lc-teacher">
                {{ getLessonForSlot(day.lessons, timeSlot)?.teacher?.label }}
              </div>
              <!-- Для расписания преподавателя — показываем все группы списком (объединённые) -->
              <div
                v-if="mode !== 'group' && (getLessonForSlot(day.lessons, timeSlot)?.groups?.length ?? 0) > 0"
                class="lc-teacher"
              >
                {{ getLessonForSlot(day.lessons, timeSlot)?.groups.map((g) => g.name).join(', ') }}
              </div>
            </button>
          </div>
        </div>

        <!-- Break row -->
        <div v-if="slotIdx !== allTimeSlots.length - 1" class="sg-row brk-row" :style="{ height: BREAK_PX + 'px' }" aria-hidden="true">
          <div class="sg-brk-meta">
            <span class="brk-lbl">Перерыв</span>
          </div>
          <div
            v-for="day in displayedDays"
            :key="day.date + '_brk_' + slotIdx"
            class="sg-brk-cell"
            :class="{ 'today-col': isTodayDate(day.date) }"
          >
            <span class="brk-dots">· · ·</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ─── Container ─── */
.sg-wrap {
  --meta-w: 88px;
  --day-min: 126px;
  --cols: var(--meta-w) repeat(6, minmax(var(--day-min), 1fr));
  background: var(--ds-surface);
}

.sg-body { position: relative; }

/* ─── Empty state — нет занятий на неделю ─── */
.sg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 32px 64px;
  gap: 16px;
  min-height: 360px;
  animation: sg-empty-in 0.32s var(--ease-out, ease);
}

.sg-empty-illustration {
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.sg-empty-illustration svg {
  width: 100%;
  height: 100%;
  display: block;
  animation: sg-empty-float 4.5s ease-in-out infinite;
}

.sg-empty-title {
  font-family: var(--ds-font-display);
  font-size: 22px;
  font-weight: 800;
  color: var(--ds-fg);
  letter-spacing: -0.015em;
}

.sg-empty-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--ds-fg-soft);
  max-width: 360px;
}

@keyframes sg-empty-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}

@keyframes sg-empty-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}

@media (prefers-reduced-motion: reduce) {
  .sg-empty,
  .sg-empty-illustration svg {
    animation: none;
  }
}

/* ─── Shared grid template ─── */
.sg-hdr,
.sg-row,
.tl {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 0;
  min-width: 860px;
}

/* ─── Header (without sticky — раньше sticky внутри overflow-контейнера
        ломал выравнивание и первая строка таблицы оказывалась перекрыта) ─── */
.sg-hdr {
  background: var(--ds-surface);
  border-bottom: 1px solid var(--ds-border);
}

.sg-hdr-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  border-right: 1px solid var(--ds-border);
  color: var(--ds-fg-faint);
}

.sg-hdr-meta-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.sg-hdr-cell {
  padding: 6px 6px;
  border-right: 1px solid var(--ds-border);
  text-align: center;
}
.sg-hdr-cell:last-child { border-right: none; }
.sg-hdr-cell.today-hdr { background: var(--ds-accent-soft); }

.day-n { font-size: 11px; font-weight: 700; color: var(--ds-fg); line-height: 1.2; }
.day-d { font-size: 10px; color: var(--ds-fg-soft); margin-top: 1px; font-family: var(--ds-font-mono); line-height: 1.2; }
.today-hdr .day-n { color: var(--ds-accent); }

.today-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--ds-accent);
  margin: 3px auto 0;
}

/* ─── Lesson rows (fixed height) ─── */
.sg-row {
  border-bottom: 1px solid var(--ds-border);
  position: relative;
}
.sg-row:last-child { border-bottom: none; }

.sg-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 6px;
  border-right: 1px solid var(--ds-border);
}

.pair-num {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 1px solid var(--ds-border-strong);
  background: var(--ds-surface-soft);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 10px;
  color: var(--ds-fg);
  flex-shrink: 0;
}

.time-stk { flex: 1; text-align: center; }
.ts { font-family: var(--ds-font-mono); font-size: 10px; font-weight: 600; color: var(--ds-fg); line-height: 1.3; }
.te { font-family: var(--ds-font-mono); font-size: 9.5px; color: var(--ds-fg-faint); margin-top: 1px; line-height: 1.3; }

/* ─── Lesson cells ─── */
.sg-cell {
  padding: 4px;
  border-right: 1px solid var(--ds-border);
}
.sg-cell:last-child { border-right: none; }
.sg-cell.today-col { background: rgba(26, 79, 219, .025); }
[data-theme="dark"] .sg-cell.today-col { background: rgba(96, 165, 250, .05); }

/* ─── Lesson cards ─── */
.lc {
  position: relative;
  padding: 5px 8px 5px 14px;
  border-radius: var(--r-md);
  border: 1px solid var(--ds-border);
  background: var(--ds-surface);
  box-shadow: var(--shadow-xs);
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
  transition: box-shadow .15s, border-color .15s, transform .1s;
  font-family: inherit;
  text-align: left;
  overflow: hidden;
}

.lc:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--ds-border-strong);
  transform: translateY(-1px);
}

.lc:focus-visible {
  outline: 0;
  box-shadow: var(--shadow-focus);
}

.lc::before {
  content: '';
  position: absolute;
  left: 4px; top: 8px; bottom: 8px;
  width: 3px; border-radius: 3px;
  background: var(--ds-accent);
}
.lc.type-practice::before { background: var(--green); }
.lc.type-lab::before      { background: var(--amber); }
.lc.type-exam::before     { background: var(--red); }
.lc.type-intro::before    { background: var(--violet); }

.lc.cur {
  border-color: var(--ds-accent-border);
  box-shadow: 0 0 0 3px var(--ds-accent-soft), var(--shadow-sm);
}

/* ─── "Сейчас" indicator ─── */
.lc-now {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 700;
  color: var(--red);
  text-transform: uppercase;
  letter-spacing: .04em;
}

.now-p {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--red);
  animation: pulse 1.8s infinite;
  display: inline-block;
  flex-shrink: 0;
}

@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(239, 68, 68, .5); }
  70%  { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

/* ─── Chips ─── */
.lc-chips { display: flex; gap: 3px; flex-wrap: wrap; }

.chip-t {
  display: inline-flex;
  align-items: center;
  padding: 1px 5px;
  border-radius: var(--r-full);
  font-size: 9.5px;
  font-weight: 600;
  white-space: nowrap;
}

.chip-type { background: var(--ds-accent-soft); color: var(--ds-accent); }
.type-practice .chip-type { background: rgba(16, 185, 129, .12); color: var(--green); }
.type-lab .chip-type      { background: rgba(245, 158, 11, .14); color: var(--amber); }
.type-exam .chip-type     { background: rgba(239, 68, 68, .12);  color: var(--red); }
.type-intro .chip-type    { background: rgba(139, 92, 246, .12); color: var(--violet); }

.chip-room { background: rgba(15, 23, 42, .05); color: var(--ds-fg-soft); }
[data-theme="dark"] .chip-room { background: rgba(255, 255, 255, .07); }

/* ─── Card content ─── */
.lc-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-fg);
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lc-teacher {
  font-size: 10px;
  color: var(--ds-fg-soft);
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Break rows ─── */
.brk-row {
  background: rgba(15, 23, 42, .015);
  display: grid;
  align-items: center;
}
[data-theme="dark"] .brk-row { background: rgba(255, 255, 255, .02); }

.sg-brk-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--ds-border);
  padding: 0 6px;
  height: 100%;
}

.brk-lbl {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--ds-fg-faint);
  padding: 2px 8px;
  border-radius: var(--r-full);
  border: 1px dashed var(--ds-border-strong);
  white-space: nowrap;
}

.sg-brk-cell {
  border-right: 1px solid var(--ds-border);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.sg-brk-cell:last-child { border-right: none; }
.brk-dots {
  font-size: 11px;
  color: var(--ds-fg-faint);
  opacity: .35;
  letter-spacing: 3px;
}

/* ─── Current time line ─── */
.tl {
  position: absolute;
  left: 0; right: 0;
  height: 0;
  z-index: 5;
  pointer-events: none;
}

.tl-m { border-top: 2px dashed rgba(15, 23, 42, .1); }
.tl-c { position: relative; height: 0; border-top: 2px dashed rgba(15, 23, 42, .1); }
[data-theme="dark"] .tl-m,
[data-theme="dark"] .tl-c { border-top-color: rgba(255, 255, 255, .12); }
.tl-c.today { border-top-color: var(--red); border-top-style: solid; }

.tl-dot {
  position: absolute;
  left: -1px; top: -5px;
  width: 9px; height: 9px;
  border-radius: 50%;
  background: var(--red);
  border: 2px solid var(--ds-surface);
  box-shadow: 0 0 0 1px var(--red);
}

/* ─── Responsive ─── */
@media (max-width: 1023px) {
  .sg-wrap { --meta-w: 76px; --day-min: 100px; }
}
</style>

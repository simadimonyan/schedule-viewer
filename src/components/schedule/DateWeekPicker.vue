<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  /** Текущая выбранная дата (понедельник отображаемой недели) */
  modelValue: Date | null
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date): void
  (e: 'update:open', value: boolean): void
  (e: 'select', value: Date): void
}>()

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const dayShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const viewDate = ref(new Date())

watch(
  () => props.modelValue,
  (v) => {
    if (v) viewDate.value = new Date(v)
  },
  { immediate: true },
)

const year = computed(() => viewDate.value.getFullYear())
const month = computed(() => viewDate.value.getMonth())
const monthLabel = computed(() => `${monthNames[month.value]} ${year.value}`)

/* Понедельник и воскресенье недели, которая сейчас выбрана —
 * нужны для подсветки попадающих в неё дней. */
const selectedWeekStart = computed(() => {
  const v = props.modelValue
  if (!v) return null
  const d = new Date(v)
  d.setHours(0, 0, 0, 0)
  return d
})

const selectedWeekEnd = computed(() => {
  const start = selectedWeekStart.value
  if (!start) return null
  const e = new Date(start)
  e.setDate(e.getDate() + 6)
  return e
})

const days = computed(() => {
  const first = new Date(year.value, month.value, 1)
  const dow = first.getDay() || 7
  const startOffset = dow - 1
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const prevMonthDays = new Date(year.value, month.value, 0).getDate()
  const result: Array<{ date: Date; day: number; isCurrentMonth: boolean; isToday: boolean; inSelectedWeek: boolean }> = []

  const isInSelectedWeek = (d: Date) => {
    if (!selectedWeekStart.value || !selectedWeekEnd.value) return false
    return d >= selectedWeekStart.value && d <= selectedWeekEnd.value
  }

  for (let i = 0; i < startOffset; i++) {
    const d = prevMonthDays - startOffset + i + 1
    const date = new Date(year.value, month.value - 1, d)
    result.push({
      date,
      day: d,
      isCurrentMonth: false,
      isToday: isToday(date),
      inSelectedWeek: isInSelectedWeek(date),
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year.value, month.value, d)
    result.push({
      date,
      day: d,
      isCurrentMonth: true,
      isToday: isToday(date),
      inSelectedWeek: isInSelectedWeek(date),
    })
  }

  const rest = 42 - result.length
  for (let i = 0; i < rest; i++) {
    const date = new Date(year.value, month.value + 1, i + 1)
    result.push({
      date,
      day: i + 1,
      isCurrentMonth: false,
      isToday: isToday(date),
      inSelectedWeek: isInSelectedWeek(date),
    })
  }
  return result
})

function isToday(d: Date): boolean {
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

function prevMonth() {
  viewDate.value = new Date(year.value, month.value - 1)
}

function nextMonth() {
  viewDate.value = new Date(year.value, month.value + 1)
}

function select(day: (typeof days.value)[0]) {
  emit('update:modelValue', day.date)
  emit('select', day.date)
  emit('update:open', false)
}

function close() {
  emit('update:open', false)
}

function handleBackdropClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.classList.contains('cal-ov')) close()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="cal">
      <div v-if="open" class="cal-ov" @click="handleBackdropClick">
        <div class="cal-panel" role="dialog" aria-label="Выбор недели по дате">
          <!-- Single header row: nav-group слева + close-button справа,
               на одной горизонтальной линии. -->
          <div class="cal-head">
            <div class="cal-head-nav">
              <button type="button" class="cal-nav" aria-label="Предыдущий месяц" @click="prevMonth">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span class="cal-month">{{ monthLabel }}</span>
              <button type="button" class="cal-nav" aria-label="Следующий месяц" @click="nextMonth">
                <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <button type="button" class="cal-x" aria-label="Закрыть" @click="close">
              <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="cal-dhdr">
            <span v-for="w in dayShort" :key="w">{{ w }}</span>
          </div>

          <div class="cal-grid">
            <button
              v-for="(day, i) in days"
              :key="i"
              type="button"
              class="cal-d"
              :class="{
                'other-mo': !day.isCurrentMonth,
                'in-wk': day.inSelectedWeek,
                'today-cal': day.isToday,
              }"
              @click="select(day)"
            >
              {{ day.day }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ─── Overlay (центрируем по экрану + blur backdrop) ─── */
.cal-ov {
  position: fixed;
  inset: 0;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.4);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  padding: 16px;
}

.cal-panel {
  position: relative;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--r-xl);
  padding: 14px 16px 16px;
  box-shadow: var(--shadow-xl);
  width: 296px;
  max-width: 92vw;
  color: var(--ds-fg);
}

/* ─── Head: nav-group (← month →) слева + close-X справа в одну линию ─── */
.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.cal-head-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.cal-x {
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  background: var(--ds-surface-soft);
  color: var(--ds-fg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}

.cal-x:hover {
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
}

.cal-x svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
}

.cal-month {
  font-family: var(--ds-font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--ds-fg);
  letter-spacing: -0.01em;
  /* Месяц растягивается между nav-стрелками, оставляя стабильную
     ширину header'а независимо от длины месяца. */
  flex: 1;
  text-align: center;
  white-space: nowrap;
}

.cal-nav {
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--ds-fg-soft);
  transition: background 0.12s, color 0.12s;
  border: none;
  cursor: pointer;
}

.cal-nav:hover {
  background: var(--ds-surface-soft);
  color: var(--ds-fg);
}

.cal-nav svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ─── Day-of-week header ─── */
.cal-dhdr {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;
}

.cal-dhdr span {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--ds-fg-faint);
  text-align: center;
  padding: 2px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

/* ─── Grid of days ─── */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-d {
  height: 32px;
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s;
  color: var(--ds-fg-muted);
  background: transparent;
  border: none;
  font-family: inherit;
}

.cal-d:hover {
  background: var(--ds-surface-soft);
  color: var(--ds-fg);
}

.cal-d.other-mo {
  color: var(--ds-fg-faint);
}

/* Подсвечиваем все дни выбранной недели */
.cal-d.in-wk {
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
  font-weight: 600;
}

/* Сегодня — приоритетнее, плотный акцент */
.cal-d.today-cal {
  background: var(--ds-accent);
  color: #fff;
  font-weight: 700;
}

/* ─── Transition ─── (единый transition-язык: spring enter + ease-in exit) */
.cal-enter-active .cal-panel {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.22s ease;
}
.cal-leave-active .cal-panel {
  transition: transform 0.18s cubic-bezier(0.55, 0, 1, 0.45),
    opacity 0.16s ease;
}

.cal-enter-active {
  transition: opacity 0.22s ease, backdrop-filter 0.22s ease,
    -webkit-backdrop-filter 0.22s ease;
}
.cal-leave-active {
  transition: opacity 0.16s ease, backdrop-filter 0.16s ease,
    -webkit-backdrop-filter 0.16s ease;
}

.cal-enter-from,
.cal-leave-to {
  opacity: 0;
  -webkit-backdrop-filter: blur(0);
  backdrop-filter: blur(0);
}

.cal-enter-from .cal-panel,
.cal-leave-to .cal-panel {
  transform: scale(0.92) translateY(16px);
  opacity: 0;
}
</style>

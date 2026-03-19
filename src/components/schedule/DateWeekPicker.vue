<script setup lang="ts">
import { computed, ref, watch } from 'vue'
const props = withDefaults(
  defineProps<{
    modelValue: Date | null
    open: boolean
    /** Позиция якоря (левый верхний угол триггера) для выравнивания */
    anchor?: { top: number; left: number; width: number; height: number }
  }>(),
  { anchor: undefined }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date): void
  (e: 'update:open', value: boolean): void
  (e: 'select', value: Date): void
}>()

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const dayShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const viewDate = ref(new Date())

watch(
  () => props.modelValue,
  (v) => {
    if (v) viewDate.value = new Date(v)
  },
  { immediate: true }
)

const year = computed(() => viewDate.value.getFullYear())
const month = computed(() => viewDate.value.getMonth())
const monthLabel = computed(() => `${monthNames[month.value]} ${year.value}`)

const days = computed(() => {
  const first = new Date(year.value, month.value, 1)
  const dow = first.getDay() || 7
  const startOffset = dow - 1
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const prevMonthDays = new Date(year.value, month.value, 0).getDate()
  const result: Array<{ date: Date; day: number; isCurrentMonth: boolean; isToday: boolean; iso: string }> = []
  for (let i = 0; i < startOffset; i++) {
    const d = prevMonthDays - startOffset + i + 1
    const date = new Date(year.value, month.value - 1, d)
    result.push({
      date,
      day: d,
      isCurrentMonth: false,
      isToday: isToday(date),
      iso: dateToISO(date),
    })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year.value, month.value, d)
    result.push({
      date,
      day: d,
      isCurrentMonth: true,
      isToday: isToday(date),
      iso: dateToISO(date),
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
      iso: dateToISO(date),
    })
  }
  return result
})

function dateToISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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

function goToday() {
  const t = new Date()
  viewDate.value = new Date(t)
  emit('update:modelValue', t)
  emit('select', t)
  emit('update:open', false)
}

function select(day: (typeof days.value)[0]) {
  emit('update:modelValue', day.date)
  emit('select', day.date)
  emit('update:open', false)
}

function close() {
  emit('update:open', false)
}

const dropdownStyle = computed(() => {
  if (!props.anchor) return { left: '50%', transform: 'translateX(-50%)' }
  const { top, left, width, height } = props.anchor
  const centerX = left + width / 2
  return {
    top: `${top + height + 6}px`,
    left: `${centerX}px`,
    transform: 'translateX(-50%)',
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="calendar">
      <div
        v-if="open"
        class="calendar-backdrop"
        aria-hidden="true"
        @click="close"
      />
    </Transition>
    <Transition name="calendar">
      <div
        v-if="open"
        class="calendar-dropdown"
        role="dialog"
        aria-label="Выбор недели по дате"
        :style="dropdownStyle"
      >
        <div class="calendar-header">
          <button
            type="button"
            class="cal-btn nav"
            aria-label="Предыдущий месяц"
            @click="prevMonth"
          >
            ‹
          </button>
          <span class="calendar-title">{{ monthLabel }}</span>
          <button
            type="button"
            class="cal-today"
            @click="goToday"
          >
            Сегодня
          </button>
          <button
            type="button"
            class="cal-btn nav"
            aria-label="Следующий месяц"
            @click="nextMonth"
          >
            ›
          </button>
        </div>
        <div class="calendar-weekdays">
          <span
            v-for="w in dayShort"
            :key="w"
            class="weekday"
          >
            {{ w }}
          </span>
        </div>
        <div class="calendar-grid">
          <button
            v-for="(day, i) in days"
            :key="i"
            type="button"
            class="cal-day"
            :class="{
              other: !day.isCurrentMonth,
              today: day.isToday,
            }"
            @click="select(day)"
          >
            {{ day.day }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.calendar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 999;
}

.calendar-dropdown {
  position: fixed;
  z-index: 1000;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1);
  padding: 0.75rem;
  min-width: 260px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.cal-today {
  height: 2rem;
  padding: 0 0.65rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.02);
  color: #334155;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  will-change: transform;
}

.cal-today:hover {
  transform: translateY(-1px);
  border-color: rgba(148, 163, 184, 0.4);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
}

.cal-today:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.calendar-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.cal-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #475569;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.cal-btn:hover {
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 0.35rem;
}

.weekday {
  font-size: 0.65rem;
  font-weight: 600;
  color: #64748b;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 0.8rem;
  color: #0f172a;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.cal-day:hover {
  background: var(--primarySoft);
  color: var(--primary);
}

.cal-day.other {
  color: #94a3b8;
}

.cal-day.today {
  background: var(--primarySoft);
  color: var(--primary);
  font-weight: 600;
}

.calendar-enter-active,
.calendar-leave-active {
  transition: opacity 0.2s ease;
}

.calendar-enter-from,
.calendar-leave-to {
  opacity: 0;
}

.calendar-dropdown.calendar-enter-active,
.calendar-dropdown.calendar-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.calendar-dropdown.calendar-enter-from,
.calendar-dropdown.calendar-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

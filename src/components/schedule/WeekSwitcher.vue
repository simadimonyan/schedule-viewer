<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatDateFromISO } from '../../utils/date'
import DateWeekPicker from './DateWeekPicker.vue'

const props = defineProps<{
  /** Текст диапазона, например "17.03 — 23.03" */
  label?: string
  /** Чётность: "Чётная" | "Нечётная" */
  weekLabel?: string
  /** Понедельник отображаемой недели для календаря */
  weekStartDate?: Date | null
}>()

const emit = defineEmits<{
  (e: 'prev-week'): void
  (e: 'next-week'): void
  (e: 'go-date', date: Date): void
}>()

const calendarOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const calendarAnchor = ref<{ top: number; left: number; width: number; height: number } | undefined>(undefined)

const displayDate = computed(() => {
  const d = props.weekStartDate
  if (!d) return ''
  return formatDateFromISO(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  )
})

function openCalendar() {
  if (triggerRef.value) {
    const r = triggerRef.value.getBoundingClientRect()
    calendarAnchor.value = { top: r.top, left: r.left, width: r.width, height: r.height }
  } else {
    calendarAnchor.value = undefined
  }
  calendarOpen.value = true
}

function onCalendarSelect(date: Date) {
  emit('go-date', date)
}

function onPrevWeek() {
  emit('prev-week')
}

function onNextWeek() {
  emit('next-week')
}
</script>

<template>
  <div class="panel">
    <div class="panel-range">
      <span v-if="label" class="range-text">{{ label }}</span>
      <span v-if="weekLabel" class="parity-badge">{{ weekLabel }}</span>
    </div>
    <div class="panel-nav">
      <button
        type="button"
        class="btn-icon"
        aria-label="Предыдущая неделя"
        @click="onPrevWeek"
      >
        ‹
      </button>
      <button
        ref="triggerRef"
        type="button"
        class="date-trigger"
        aria-label="Выбрать неделю по дате"
        @click="openCalendar"
      >
        <span class="date-trigger-icon">📅</span>
        <span class="date-trigger-text">{{ displayDate || 'Дата' }}</span>
      </button>
      <button
        type="button"
        class="btn-icon"
        aria-label="Следующая неделя"
        @click="onNextWeek"
      >
        ›
      </button>
    </div>

    <DateWeekPicker
      :model-value="weekStartDate ?? null"
      :open="calendarOpen"
      :anchor="calendarAnchor"
      @update:open="calendarOpen = $event"
      @select="onCalendarSelect"
    />
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  min-height: 2.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: #fff;
}

.panel-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.range-text {
  font-size: 0.8rem;
  color: var(--text);
  font-weight: 500;
}

.parity-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.06);
  color: var(--text);
}

.panel-nav {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-icon:hover {
  background: rgba(15, 23, 42, 0.06);
}

.date-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  font-size: 0.78rem;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.date-trigger:hover {
  border-color: rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.02);
}

.date-trigger-icon {
  font-size: 0.9rem;
  opacity: 0.9;
}

.date-trigger-text {
  font-weight: 500;
}

@media (max-width: 639px) {
  .panel {
    flex-wrap: wrap;
  }

  .panel-range {
    order: 2;
    width: 100%;
    justify-content: center;
  }

  .panel-nav {
    order: 1;
    width: 100%;
    justify-content: center;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { formatDateFromISO, formatRelativeTime } from '../../utils/date'
import DateWeekPicker from './DateWeekPicker.vue'

const props = withDefaults(
  defineProps<{
    /** Текст диапазона, например "21 апр — 27 апр 2026" */
    label?: string
    /** Чётность: "Чётная" | "Нечётная" */
    weekLabel?: string
    /** Понедельник отображаемой недели */
    weekStartDate?: Date | null
    /** Кол-во занятий за неделю */
    totalCount?: number
    /** Кол-во занятий сегодня */
    todayCount?: number
    /** Текущий вид: grid | list */
    view?: 'grid' | 'list'
    /** Время последнего обновления расписания (epoch millis).
     *  null/undefined → badge скрыт. */
    updatedAt?: number | null
  }>(),
  { view: 'grid', totalCount: 0, todayCount: 0, updatedAt: null }
)

const emit = defineEmits<{
  (e: 'prev-week'): void
  (e: 'next-week'): void
  (e: 'today'): void
  (e: 'go-date', date: Date): void
  (e: 'change-view', view: 'grid' | 'list'): void
}>()

const calendarOpen = ref(false)

function openCalendar() {
  calendarOpen.value = true
}

const displayDate = computed(() => {
  const d = props.weekStartDate
  if (!d) return ''
  return formatDateFromISO(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  )
})

function onCalendarSelect(date: Date) {
  emit('go-date', date)
}

/* «Обновлено …» — relative time с автоматическим обновлением каждую минуту,
 * чтобы badge оставался актуальным без перезагрузки страницы. */
const nowTick = ref(Date.now())
let nowTicker: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  nowTicker = setInterval(() => {
    nowTick.value = Date.now()
  }, 60_000)
})

onUnmounted(() => {
  if (nowTicker) clearInterval(nowTicker)
})

const updatedAtLabel = computed(() => {
  if (!props.updatedAt) return ''
  // depend on nowTick для реактивности
  void nowTick.value
  return formatRelativeTime(props.updatedAt)
})

const updatedAtTooltip = computed(() => {
  if (!props.updatedAt) return ''
  const d = new Date(props.updatedAt)
  return `Обновлено ${d.toLocaleString('ru-RU')}`
})
</script>

<template>
  <div class="cbar">
    <!-- Week navigation -->
    <div class="wk-nav">
      <button class="wk-nav-btn" type="button" aria-label="Предыдущая неделя" @click="emit('prev-week')">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button
        class="wk-lbl-btn"
        type="button"
        :title="displayDate || 'Выбрать неделю'"
        @click="openCalendar"
      >
        {{ label || displayDate || '—' }}
      </button>
      <button class="wk-nav-btn" type="button" aria-label="Следующая неделя" @click="emit('next-week')">
        <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button class="wk-today-btn" type="button" @click="emit('today')">Сегодня</button>
      <button class="wk-nav-btn" type="button" aria-label="Выбрать дату" @click="openCalendar" style="margin-left:2px">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
        </svg>
      </button>
    </div>

    <!-- Parity badge -->
    <span v-if="weekLabel" class="wk-parity-badge">{{ weekLabel }}</span>

    <!-- Spacer -->
    <div class="csep" />

    <!-- Updated-at badge — показываем только если backend вернул updatedAt -->
    <span
      v-if="updatedAt"
      class="updated-badge"
      :title="updatedAtTooltip"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      <span class="updated-badge-text">Обновлено {{ updatedAtLabel }}</span>
    </span>

    <!-- Stats -->
    <div class="lesson-stat">
      <span class="stat-dot" />
      <span><b>{{ totalCount }}</b> занятий · <b>{{ todayCount }}</b> сегодня</span>
    </div>

    <!-- View toggle -->
    <div class="vtoggle">
      <button
        class="vb"
        :class="{ active: view === 'grid' }"
        type="button"
        aria-label="Сетка"
        @click="emit('change-view', 'grid')"
      >
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      </button>
      <button
        class="vb"
        :class="{ active: view === 'list' }"
        type="button"
        aria-label="Список"
        @click="emit('change-view', 'list')"
      >
        <svg viewBox="0 0 24 24">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <circle cx="3" cy="6" r="1" fill="currentColor"/>
          <circle cx="3" cy="12" r="1" fill="currentColor"/>
          <circle cx="3" cy="18" r="1" fill="currentColor"/>
        </svg>
      </button>
    </div>

    <DateWeekPicker
      :model-value="weekStartDate ?? null"
      :open="calendarOpen"
      @update:open="calendarOpen = $event"
      @select="onCalendarSelect"
    />
  </div>
</template>

<style scoped>
.cbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--r-lg);
  padding: 9px 14px;
  box-shadow: var(--shadow-xs);
}

.wk-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.wk-nav-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  border: 1px solid var(--ds-border-strong);
  background: var(--ds-surface-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ds-fg-soft);
  transition: all 0.15s;
  flex-shrink: 0;
  cursor: pointer;
}

.wk-nav-btn:hover {
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
  border-color: var(--ds-accent-border);
}

.wk-nav-btn svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.wk-lbl-btn {
  font-family: var(--ds-font-display);
  font-size: 13px;
  font-weight: 700;
  color: var(--ds-fg);
  padding: 4px 10px;
  border-radius: var(--r-sm);
  transition: background 0.15s;
  white-space: nowrap;
  cursor: pointer;
  border: none;
  background: none;
}

.wk-lbl-btn:hover {
  background: var(--ds-surface-soft);
}

.wk-today-btn {
  height: 26px;
  padding: 0 10px;
  border-radius: var(--r-full);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ds-accent);
  border: 1px solid var(--ds-accent-border);
  background: var(--ds-accent-soft);
  white-space: nowrap;
  transition: all 0.15s;
  cursor: pointer;
}

.wk-today-btn:hover {
  background: var(--ds-accent);
  color: #fff;
}

.wk-parity-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 24px;
  /* Асимметричный padding-top компенсирует визуальное смещение
     uppercase-глифов вверх от геометрического центра line-box.
     В Plus Jakarta Sans cap-height расположена выше middle-line,
     поэтому добавляем 1px сверху, чтобы текст сел по центру. */
  padding: 1px 10px 0;
  line-height: 1;
  border-radius: var(--r-full);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
  border: 1px solid var(--ds-accent-border);
  white-space: nowrap;
}

.csep {
  flex: 1;
}

/* ─── Updated-at badge ─── */
.updated-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--r-full);
  background: var(--ds-surface-soft);
  border: 1px solid var(--ds-border);
  font-size: 11px;
  font-weight: 500;
  color: var(--ds-fg-soft);
  white-space: nowrap;
  cursor: help;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.updated-badge:hover {
  background: var(--ds-accent-soft);
  border-color: var(--ds-accent-border);
  color: var(--ds-accent);
}

.updated-badge svg {
  width: 11px;
  height: 11px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
  opacity: 0.8;
}

/* На узких экранах прячем текст, оставляя только иконку с tooltip'ом */
@media (max-width: 640px) {
  .updated-badge-text {
    display: none;
  }
  .updated-badge {
    padding: 4px 8px;
  }
}

.lesson-stat {
  font-size: 12px;
  color: var(--ds-fg-soft);
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.lesson-stat b {
  color: var(--ds-fg);
  font-weight: 700;
}

.stat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ds-accent);
}

.vtoggle {
  display: flex;
  gap: 2px;
  background: var(--ds-surface-soft);
  padding: 2px;
  border-radius: var(--r-sm);
  border: 1px solid var(--ds-border);
}

.vb {
  width: 28px;
  height: 26px;
  border-radius: var(--r-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ds-fg-soft);
  transition: all 0.15s;
  border: none;
  background: none;
  cursor: pointer;
}

.vb svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.vb.active {
  background: var(--ds-surface);
  box-shadow: var(--shadow-xs);
  color: var(--ds-accent);
}

@media (max-width: 768px) {
  .cbar {
    padding: 8px 10px;
    gap: 8px;
    /* Центрируем оставшееся содержимое — переключатель формата убран,
       статистики и парности нет; остаётся только навигация по неделе. */
    justify-content: center;
  }
  .wk-lbl-btn {
    font-size: 12px;
    padding: 3px 7px;
  }
  .csep,
  .wk-parity-badge,
  .lesson-stat,
  .vtoggle {
    display: none;
  }
}
</style>

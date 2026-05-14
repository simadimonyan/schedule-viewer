<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSchedule } from '../hooks/useSchedule'
import { formatDateFromISO, formatDateISO } from '../utils/date'
import type { Lesson } from '../types/schedule'
import Breadcrumbs from '../components/layout/Breadcrumbs.vue'
import ControlBar from '../components/schedule/ControlBar.vue'
import ScheduleGrid from '../components/schedule/ScheduleGrid.vue'
import ScheduleList from '../components/schedule/ScheduleList.vue'
import LegendTab from '../components/schedule/LegendTab.vue'
import LessonDrawer from '../components/schedule/LessonDrawer.vue'
import Loader from '../components/common/Loader.vue'
import ErrorMessage from '../components/common/ErrorMessage.vue'

const route = useRoute()
const teacherId = computed(() => String(route.params.teacherId || ''))

const { loading, error, week, weekStartDate, goToPrevWeek, goToNextWeek, goToWeekByDate } = useSchedule({
  mode: 'teacher',
  id: teacherId.value,
})

const SCOPE_KEY = 'schedule_scope'

const view = ref<'grid' | 'list'>('grid')
const scope = ref<'week' | 'day'>(
  localStorage.getItem(SCOPE_KEY) === 'day' ? 'day' : 'week'
)
const selectedDate = ref<Date>(new Date())

watch(() => week.value?.startDate, () => {
  if (!week.value || scope.value !== 'day') return
  const selISO = formatDateISO(selectedDate.value)
  if (selISO < week.value.startDate || selISO > week.value.endDate) {
    const [y, m, d] = week.value.startDate.split('-').map(Number)
    selectedDate.value = new Date(y!, m! - 1, d!)
  }
})

const filteredWeek = computed(() => {
  if (!week.value || scope.value === 'week') return week.value
  const selISO = formatDateISO(selectedDate.value)
  return { ...week.value, days: week.value.days.filter(d => d.date === selISO) }
})

const weekRangeLabel = computed(() => {
  if (!week.value) return ''
  return `${formatDateFromISO(week.value.startDate)} — ${formatDateFromISO(week.value.endDate)}`
})

const displayedWeekLabel = computed(() => {
  if (!week.value) return ''
  return week.value.weekCount === 1 ? 'Нечётная' : 'Чётная'
})

const totalCount = computed(() => {
  if (!week.value) return 0
  return week.value.days.reduce((acc, d) => acc + d.lessons.length, 0)
})

const todayCount = computed(() => {
  if (!week.value) return 0
  const t = new Date()
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const day = String(t.getDate()).padStart(2, '0')
  const todayISO = `${y}-${m}-${day}`
  return week.value.days.find((d) => d.date === todayISO)?.lessons.length || 0
})

function goToday() {
  selectedDate.value = new Date()
  goToWeekByDate(new Date())
}

function onChangeScope(newScope: 'week' | 'day') {
  if (newScope === 'day' && week.value) {
    const todayISO = formatDateISO(new Date())
    if (todayISO >= week.value.startDate && todayISO <= week.value.endDate) {
      selectedDate.value = new Date()
    } else if (weekStartDate.value) {
      selectedDate.value = new Date(weekStartDate.value)
    }
  }
  scope.value = newScope
  localStorage.setItem(SCOPE_KEY, newScope)
}

async function onPrevDay() {
  const prev = new Date(selectedDate.value)
  prev.setDate(prev.getDate() - 1)
  selectedDate.value = prev
  const prevISO = formatDateISO(prev)
  if (!week.value || prevISO < week.value.startDate || prevISO > week.value.endDate) {
    await goToWeekByDate(prev)
  }
}

async function onNextDay() {
  const next = new Date(selectedDate.value)
  next.setDate(next.getDate() + 1)
  selectedDate.value = next
  const nextISO = formatDateISO(next)
  if (!week.value || nextISO < week.value.startDate || nextISO > week.value.endDate) {
    await goToWeekByDate(next)
  }
}

/* ── Drawer-state ── */
const selectedLesson = ref<Lesson | null>(null)
const selectedDayDate = ref<string>('')

function openLesson(payload: { lesson: Lesson; dayDate: string }) {
  selectedLesson.value = payload.lesson
  selectedDayDate.value = payload.dayDate
}

function closeLesson() {
  selectedLesson.value = null
}
</script>

<template>
  <section class="page">
    <Breadcrumbs :current="teacherId" />

    <Transition name="schedule-fade" mode="out-in">
      <div v-if="error" key="error" class="content content-center">
        <ErrorMessage :message="error" />
      </div>

      <div v-else-if="!week" key="loading" class="content schedule-loading">
        <div class="schedule-loading-state">
          <Loader />
        </div>
      </div>

      <div v-else-if="week" key="schedule" class="content" :class="{ 'schedule-updating': loading }">
        <ControlBar
          :label="weekRangeLabel"
          :week-label="displayedWeekLabel"
          :week-start-date="weekStartDate"
          :total-count="totalCount"
          :today-count="todayCount"
          :view="view"
          :scope="scope"
          :selected-date="selectedDate"
          :updated-at="week.updatedAt ?? null"
          @prev-week="goToPrevWeek"
          @next-week="goToNextWeek"
          @today="goToday"
          @go-date="goToWeekByDate"
          @change-view="(v) => (view = v)"
          @change-scope="onChangeScope"
          @prev-day="onPrevDay"
          @next-day="onNextDay"
        />

        <div class="sched-block">
          <template v-if="scope === 'week'">
            <div v-if="view === 'grid'" class="grid-wrap desktop-grid">
              <ScheduleGrid :week="week" mode="teacher" @open-lesson="openLesson" />
            </div>
            <div v-else class="list-wrap">
              <ScheduleList :week="week" mode="teacher" @open-lesson="openLesson" />
            </div>
            <div v-if="view === 'grid'" class="list-wrap mobile-only">
              <ScheduleList :week="week" mode="teacher" @open-lesson="openLesson" />
            </div>
          </template>
          <!-- Режим одного дня — всегда list -->
          <div v-else class="list-wrap">
            <ScheduleList :week="filteredWeek ?? week" mode="teacher" @open-lesson="openLesson" />
          </div>
        </div>
      </div>
    </Transition>

    <LegendTab />

    <LessonDrawer
      :lesson="selectedLesson"
      :day-date="selectedDayDate"
      mode="teacher"
      @close="closeLesson"
    />
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 0 40px;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.content-center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  padding: 2rem;
}

.sched-block {
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow:
    0 1px 3px rgba(15,23,42,0.05),
    0 6px 18px rgba(15,23,42,0.07),
    0 18px 44px rgba(15,23,42,0.08);
}

[data-theme="dark"] .sched-block {
  border-width: 0.5px;
  border-color: transparent;
  background:
    radial-gradient(ellipse 55% 40% at 15% 10%, rgba(96,165,250,0.07), transparent 65%) padding-box,
    radial-gradient(ellipse 45% 35% at 85% 85%, rgba(167,139,250,0.06), transparent 60%) padding-box,
    linear-gradient(var(--ds-surface), var(--ds-surface)) padding-box,
    linear-gradient(120deg, #60A5FA 0%, #A78BFA 100%) border-box;
  box-shadow:
    0 1px 3px rgba(0,0,0,0.25),
    0 8px 24px rgba(0,0,0,0.35),
    0 22px 52px rgba(96,165,250,0.08);
}

.grid-wrap {
  overflow-x: auto;
}

.list-wrap {
  padding: 14px;
}

.desktop-grid {
  display: none;
}

.mobile-only {
  display: block;
}

@media (min-width: 1024px) {
  .desktop-grid {
    display: block;
  }
  .mobile-only {
    display: none;
  }
}

.schedule-loading {
  position: relative;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.schedule-loading-state {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
}

.schedule-fade-enter-active,
.schedule-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.schedule-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.schedule-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.schedule-updating .sched-block {
  opacity: 0.7;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
</style>

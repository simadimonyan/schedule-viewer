<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useSchedule } from '../hooks/useSchedule'
import { formatDateFromISO } from '../utils/date'
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
const groupId = computed(() => String(route.params.groupId || ''))

const { loading, error, week, weekStartDate, goToPrevWeek, goToNextWeek, goToWeekByDate } = useSchedule({
  mode: 'group',
  id: groupId.value,
})

const view = ref<'grid' | 'list'>('grid')

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
  goToWeekByDate(new Date())
}

/* ── Drawer-state: открываем подробности занятия ── */
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
    <Breadcrumbs :current="`Группа ${groupId}`" />

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
          :updated-at="week.updatedAt ?? null"
          @prev-week="goToPrevWeek"
          @next-week="goToNextWeek"
          @today="goToday"
          @go-date="goToWeekByDate"
          @change-view="(v) => (view = v)"
        />

        <div class="sched-block">
          <div v-if="view === 'grid'" class="grid-wrap desktop-grid">
            <ScheduleGrid :week="week" mode="group" @open-lesson="openLesson" />
          </div>
          <div v-else class="list-wrap">
            <ScheduleList :week="week" mode="group" @open-lesson="openLesson" />
          </div>

          <!-- На мобильных всегда показываем list-вид -->
          <div v-if="view === 'grid'" class="list-wrap mobile-only">
            <ScheduleList :week="week" mode="group" @open-lesson="openLesson" />
          </div>
        </div>
      </div>
    </Transition>

    <LegendTab />

    <LessonDrawer
      :lesson="selectedLesson"
      :day-date="selectedDayDate"
      mode="group"
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
  box-shadow: var(--shadow-sm);
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

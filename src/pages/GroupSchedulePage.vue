<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSchedule } from '../hooks/useSchedule'
import { formatDateFromISO } from '../utils/date'
import WeekSwitcher from '../components/schedule/WeekSwitcher.vue'
import ScheduleGrid from '../components/schedule/ScheduleGrid.vue'
import ScheduleList from '../components/schedule/ScheduleList.vue'
import Loader from '../components/common/Loader.vue'
import ErrorMessage from '../components/common/ErrorMessage.vue'

const route = useRoute()
const groupId = computed(() => String(route.params.groupId || ''))

const { loading, error, week, serverWeekLabel, weekStartDate, goToPrevWeek, goToNextWeek, goToWeekByDate } = useSchedule({
  mode: 'group',
  id: groupId.value,
})

const weekRangeLabel = computed(() => {
  if (!week.value) return ''
  return `${formatDateFromISO(week.value.startDate)} — ${formatDateFromISO(week.value.endDate)}`
})

const displayedWeekLabel = computed(() => {
  if (!week.value) return ''
  return week.value.weekCount === 1 ? 'Нечётная' : 'Чётная'
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1 class="title">Расписание группы</h1>
      <p class="subtitle">
        Группа:
        <span class="accent">
          {{ groupId }}
        </span>
      </p>
    </header>

    <div class="toolbar">
      <div class="status" />
    </div>

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
        <div class="desktop-only schedule-block">
          <WeekSwitcher
            :label="weekRangeLabel"
            :week-label="displayedWeekLabel"
            :week-start-date="weekStartDate"
            @prev-week="goToPrevWeek"
            @next-week="goToNextWeek"
            @go-date="goToWeekByDate"
          />
          <ScheduleGrid :week="week" mode="group" />
        </div>
        <div class="mobile-only">
          <div class="schedule-mobile-panel">
            <WeekSwitcher
              :label="weekRangeLabel"
              :week-label="displayedWeekLabel"
              :week-start-date="weekStartDate"
              @prev-week="goToPrevWeek"
              @next-week="goToNextWeek"
              @go-date="goToWeekByDate"
            />
          </div>
          <ScheduleList :week="week" />
        </div>
      </div>
      <!-- intentionally empty: while week is loading/unavailable we show only spinner -->
    </Transition>
  </section>
</template>

<style scoped> 
.page {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.page-header .title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
}

.subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: var(--text);
}

.accent {
  color: var(--text);
  font-weight: 500;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.status {
  min-height: 0.2rem;
}

.content {
  margin-top: 0.1rem;
}

.content-center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  padding: 2rem;
}

.schedule-block {
  display: flex;
  flex-direction: column;
  width: fit-content;
  min-width: 100%;
  border-radius: var(--radiusLg);
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.schedule-mobile-panel {
  margin-bottom: 0.5rem;
}

.desktop-only {
  display: none;
}

.mobile-only {
  display: block;
}

.placeholder {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: var(--text);
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

.schedule-updating .schedule-block {
  opacity: 0.7;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

@media (min-width: 768px) {
  .toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .status {
    text-align: right;
  }
}

@media (min-width: 1024px) {
  .desktop-only {
    display: block;
  }

  .mobile-only {
    display: none;
  }
}
</style>


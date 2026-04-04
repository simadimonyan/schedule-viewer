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
const teacherId = computed(() => String(route.params.teacherId || ''))

const { loading, error, week, serverWeekLabel, weekStartDate, goToPrevWeek, goToNextWeek, goToWeekByDate } = useSchedule({
  mode: 'teacher',
  id: teacherId.value,
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
          <ScheduleGrid :week="week" mode="teacher" />
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
  gap: 0;
}

.content {
  margin-top: 0;
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


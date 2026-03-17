<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
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

const showSpinner = ref(false)
const LOADING_DELAY_MS = 800
let loadingTimer: ReturnType<typeof setTimeout> | null = null

watch(loading, (isLoading) => {
  if (loadingTimer) {
    clearTimeout(loadingTimer)
    loadingTimer = null
  }
  if (isLoading && !week.value) {
    loadingTimer = setTimeout(() => {
      showSpinner.value = true
      loadingTimer = null
    }, LOADING_DELAY_MS)
  } else {
    showSpinner.value = false
  }
})

onUnmounted(() => {
  if (loadingTimer) clearTimeout(loadingTimer)
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
      <div v-else-if="loading && !week" key="loading" class="content schedule-loading">
        <div class="schedule-skeleton" />
        <div v-if="showSpinner" class="schedule-loading-state">
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
      <div v-else-if="!loading && !error" key="empty" class="content content-center">
        <p class="placeholder">Нет данных расписания для выбранной группы.</p>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
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
  gap: 0.75rem;
}

.status {
  min-height: 1.4rem;
}

.content {
  margin-top: 0.25rem;
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
}

.schedule-skeleton {
  position: absolute;
  inset: 0;
  border-radius: var(--radiusLg);
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.06) 0%,
    rgba(148, 163, 184, 0.12) 50%,
    rgba(148, 163, 184, 0.06) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shine 1.2s ease-in-out infinite;
}

.schedule-loading-state {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
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

@keyframes skeleton-shine {
  to {
    background-position: 200% 0;
  }
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


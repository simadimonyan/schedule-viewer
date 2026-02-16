<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSchedule } from '../hooks/useSchedule'
import WeekSwitcher from '../components/schedule/WeekSwitcher.vue'
import ScheduleGrid from '../components/schedule/ScheduleGrid.vue'
import ScheduleList from '../components/schedule/ScheduleList.vue'
import Loader from '../components/common/Loader.vue'
import ErrorMessage from '../components/common/ErrorMessage.vue'

const route = useRoute()
const groupId = computed(() => String(route.params.groupId || ''))

const { loading, error, week, label, changeWeek, serverWeekLabel, serverWeekCount, selectedWeekCount } = useSchedule({
  mode: 'group',
  id: groupId.value,
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
      <WeekSwitcher
        :label="label || 'Текущая неделя'"
        :server-week-label="serverWeekLabel"
        :server-week-count="serverWeekCount"
        :selected-week-count="selectedWeekCount"
        @change="changeWeek"
      />
      <div class="status">
        <Loader v-if="loading" />
        <ErrorMessage
          v-else-if="error"
          :message="error"
        />
      </div>
    </div>

    <div v-if="week" class="content">
      <div class="desktop-only">
        <ScheduleGrid :week="week" />
      </div>
      <div class="mobile-only">
        <ScheduleList :week="week" />
      </div>
    </div>

    <p v-else-if="!loading && !error" class="placeholder">
      Нет данных расписания для выбранной группы.
    </p>
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
  color: var(--muted);
}

.accent {
  color: #e5e7eb;
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

.desktop-only {
  display: none;
}

.mobile-only {
  display: block;
}

.placeholder {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: var(--muted);
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


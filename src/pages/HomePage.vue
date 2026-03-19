<script setup lang="ts">
import EntitySearch from '../components/filters/EntitySearch.vue'

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const RECENT_KEY = 'recent_schedules'
const recent = ref<Array<{ type: 'group' | 'teacher'; id: string }>>([])

onMounted(() => {
  const raw = localStorage.getItem(RECENT_KEY)
  if (raw) {
    try {
      recent.value = JSON.parse(raw) as Array<{ type: 'group' | 'teacher'; id: string }>
    } catch {}
  }
})
</script>

<template>
  <section class="home">
    <img src="@/assets/schedule.png" class="imsit">
    <div class="hero">
      <div class="hero2">
        <h1 class="hero-title">Просмотр электронного расписания</h1>
        <p class="hero-subtitle">
          Выберите группу или преподавателя из списка — поиск работает по мере ввода.
        </p>
      </div>
    </div>
    <EntitySearch />

    <div v-if="recent.length" class="recent">
        <div class="recent-title"></div>
        <div class="recent-list">
          <button
            v-for="r in recent"
            :key="r.type + r.id"
            class="recent-item"
            type="button"
            @click="r.type === 'group' ? router.push({ name: 'group-schedule', params: { groupId: r.id } }) : router.push({ name: 'teacher-schedule', params: { teacherId: r.id } })"
          >
            {{ r.type === 'group' ? 'Группа' : 'Преподаватель' }} · {{ r.id }}
          </button>
        </div>
      </div>

  </section>
</template>

<style scoped>

* {
  margin: 0;
  padding: 0;
}

.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 5vh;
  background-color: var(--background);
  padding: 0;
  margin: 0;
  gap: 0;
  position: relative;
  top: 50px;
}

.hero {
  display: flex;
  justify-content: center;
  width: 100%;
}

.imsit {
  width: 300px;
  height: auto;
  display: block;
}

.hero-title {
  font-size: 3.4rem;
  font-weight: 1600;
}

.hero-subtitle {
  font-size: 1rem;
  color: var(--text);
  padding-bottom: 20px;
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 1.8rem;
  }
}

.recent {
  margin-bottom: 0.75rem;
}

.recent-title {
  font-size: 0.75rem;
  opacity: 0.6;
  margin-bottom: 1.5rem;
}

.recent-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.recent-item {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: 0.2s ease;
}

.recent-item:hover {
  background: rgba(0,0,0,0.05);
}
</style>

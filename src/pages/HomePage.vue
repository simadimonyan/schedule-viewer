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
    <div class="home-panel">
      <div class="home-panel-inner">
        <div class="hero">
          <div class="hero2">
            <h1 class="hero-title">Просмотр электронного расписания</h1>
            <p class="hero-subtitle">
              Выберите группу или преподавателя из списка — поиск работает по мере ввода.
            </p>
          </div>
        </div>

        <div class="search-center">
          <EntitySearch />
        </div>

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
  justify-content: flex-start;
  text-align: center;
  flex: 1;
  min-height: 0;
  /* Home page background should reach the viewport edges */
  margin-left: -20px;
  margin-right: -20px;
  background-color: var(--background);
  background-image: url('@/assets/background.jpeg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 0;
  margin: 0;
  gap: 0;
  position: relative;
}

.home-panel {
  width: calc(100% + 40px);
  margin: 0 -20px;
  padding: 18px;
  border-radius: 0;
  /* Minimalistic tile background around the blocks */
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(6px);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.10);
  /* Allow vertical centering inside the panel */
  flex: 1;
  min-height: 0;
}

.home-panel-inner {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  padding: 46px 22px 30px;
  /* Layout for vertical centering of the search block */
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 0;
  /* Visual shift without affecting fixed-position children */
  margin-top: 22px;
}

.search-center {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  /* Take remaining vertical space between hero and recent */
  flex: 1;
}

@media (min-width: 768px) {
  .home {
    margin-left: -100px;
    margin-right: -100px;
  }

  .home-panel {
    width: calc(100% + 200px);
    margin: 0 -100px;
  }
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
  margin-top: 18px;
  margin-bottom: 0;
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
  justify-content: center;
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

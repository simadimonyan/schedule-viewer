<script setup lang="ts">
import EntitySearch from '../components/filters/EntitySearch.vue'
</script>

<template>
  <section class="home">
    <div class="hero">
      <h1 class="hero-title">Просмотр университетского расписания</h1>
      <p class="hero-subtitle">
        Выберите группу или преподавателя из списка — поиск работает по мере ввода.
      </p>
    </div>

    <EntitySearch />
  </section>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hero-title {
  font-size: 1.4rem;
  font-weight: 600;
}

.hero-subtitle {
  margin-top: 0.4rem;
  font-size: 0.9rem;
  color: var(--muted);
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 1.8rem;
  }
}
</style>


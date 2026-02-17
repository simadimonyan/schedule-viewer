<script setup lang="ts">
import EntitySearch from '../components/filters/EntitySearch.vue'
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
</style>

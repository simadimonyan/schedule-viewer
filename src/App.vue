<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'
</script>

<template>
  <v-app>
    <div class="app-root">
      <AppHeader />
      <main class="app-main">
        <RouterView />
      </main>
      <AppFooter />
    </div>
  </v-app>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.app-main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.5rem 1rem 2rem;
  width: 100%;
}

@media (min-width: 768px) {
  .app-main {
    padding: 0.5rem 1.5rem 3rem;
  }
}
</style>

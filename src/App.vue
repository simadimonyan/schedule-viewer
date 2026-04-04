<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'
</script>

<template>
  <v-app>
    <div class="app-root">
      <AppHeader />
      <main class="app-main">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="$route.path" />
          </Transition>
        </RouterView>
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
  width: 100%;
  margin: 0;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .app-main {
    padding: 0 100px;
  }
}

/* Let pages stretch to fill the space between header and footer */
:deep(.home),
:deep(.page) {
  flex: 1;
  min-height: 0;
}

/* Переходы между страницами */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

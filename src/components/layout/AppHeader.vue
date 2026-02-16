<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const goHome = () => {
  if (route.name !== 'home') {
    router.push({ name: 'home' })
  }
}
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <button class="brand" type="button" @click="goHome">
        <img src="@/assets/logo.svg" class="brand-mark"/>
        <span class="brand-text">
          <span class="brand-title">Моя Академия</span>
          <span class="brand-subtitle">📚 Ваше расписание всегда под рукой!</span>
        </span>
      </button>

      <nav class="nav">
        <RouterLink class="nav-link" :to="{ name: 'home' }">
          Расписание
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(13, 128, 255, 0.12), rgba(13, 128, 255, 0.02));
  backdrop-filter: blur(10px);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
}

.brand-mark {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.6rem;
  border: 2px solid #ffffff;
  background: var(--primary);
  display: flex;
  align-self: center;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  color: #ffffff;
  box-shadow: var(--shadow);
}

.brand-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.brand-title {
  padding-bottom: 1px;
  font-weight: 600;
  font-size: 1.25rem;
  letter-spacing: 0.01em;
}

.brand-subtitle {
  font-size: 1rem;
  color: var(--text);
}

.nav {
  display: flex;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.nav-link {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  color: var(--text);
  text-decoration: none;
  border: 1px solid transparent;
}

.nav-link.router-link-active {
  border-color: var(--primaryBorder);
  background: var(--primarySoft);
}

@media (min-width: 768px) {
  .header-inner {
    padding: 0.9rem 1.5rem;
  }
}
</style>


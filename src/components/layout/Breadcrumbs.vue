<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  /** Текущий узел крошки (например, "Группа ИВТ-21") */
  current: string
}>()

const router = useRouter()

function goHome() {
  router.push({ name: 'home' })
}
</script>

<template>
  <nav class="bc" aria-label="Хлебные крошки">
    <a href="#" @click.prevent="goHome">Главная</a>
    <span aria-hidden="true">›</span>
    <a href="#" @click.prevent="goHome">Расписание</a>
    <span aria-hidden="true">›</span>
    <span class="bc-cur">{{ current }}</span>
  </nav>
</template>

<style scoped>
.bc {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ds-fg-faint);
  flex-wrap: wrap;
}

.bc a {
  color: var(--ds-accent);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
}

.bc a:hover {
  text-decoration: underline;
}

.bc-cur {
  color: var(--ds-fg-soft);
  font-weight: 500;
}
</style>

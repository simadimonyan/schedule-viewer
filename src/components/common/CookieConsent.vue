<script setup lang="ts">
import { onMounted, ref } from 'vue'

const KEY = 'cookie_consent'
const visible = ref(false)

onMounted(() => {
  visible.value = localStorage.getItem(KEY) !== 'accepted'
})

function accept() {
  localStorage.setItem(KEY, 'accepted')
  visible.value = false
}
</script>

<template>
  <Transition name="cookie">
    <aside v-if="visible" class="cookie" aria-label="Согласие на cookie">
      <div class="cookie-text">
        Мы используем cookie и локальное хранилище для настроек, кеша расписания
        и обезличенной аналитики.
      </div>
      <div class="cookie-actions">
        <RouterLink class="cookie-link" :to="{ name: 'privacy' }">
          Подробнее
        </RouterLink>
        <button class="cookie-btn" type="button" @click="accept">
          Согласен
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.cookie {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 1800;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  max-width: 720px;
  margin: 0 auto;
  padding: 14px 16px;
  border: 1px solid var(--ds-border-strong);
  border-radius: var(--r-lg);
  background: var(--ds-surface);
  box-shadow: var(--shadow-xl);
}

.cookie-text {
  font-size: 13px;
  line-height: 1.45;
  color: var(--ds-fg-soft);
}

.cookie-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.cookie-link {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ds-accent);
  text-decoration: none;
}

.cookie-btn {
  height: 34px;
  padding: 0 16px;
  border-radius: var(--r-full);
  background: var(--ds-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.cookie-enter-active,
.cookie-leave-active {
  transition: opacity 0.2s ease, transform 0.24s var(--ease-out, ease);
}

.cookie-enter-from,
.cookie-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 640px) {
  .cookie {
    align-items: stretch;
    flex-direction: column;
    bottom: max(12px, env(safe-area-inset-bottom));
    padding: 14px;
  }

  .cookie-actions {
    justify-content: flex-end;
  }
}
</style>

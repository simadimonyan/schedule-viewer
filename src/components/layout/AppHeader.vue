<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { useTheme } from '../../composables/useTheme'

const router = useRouter()
const route = useRoute()
const { theme, toggle: toggleTheme } = useTheme()

const goHome = () => {
  if (route.name !== 'home') {
    router.push({ name: 'home' })
  }
}

const scheduleOwnerText = computed(() => {
  if (route.name === 'group-schedule') {
    return `Группа: ${String(route.params.groupId ?? '')}`
  }
  if (route.name === 'teacher-schedule') {
    return `Преподаватель: ${String(route.params.teacherId ?? '')}`
  }
  return ''
})

const showCenterOwnerText = computed(() => Boolean(scheduleOwnerText.value))
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <button class="brand" type="button" @click="goHome">
        <div class="brand-mark">
          <img src="@/assets/logo.svg" class="brand-logo" alt="logo" />
        </div>
        <div class="brand-text">
          <span class="brand-title">Моя Академия</span>
          <span class="brand-subtitle">ИМСИТ</span>
        </div>
      </button>

      <!-- Owner chip — абсолютно позиционирован по центру вьюпорта,
           поэтому не зависит от ширины слева/справа от него. -->
      <span v-if="showCenterOwnerText" class="owner-chip">
        {{ scheduleOwnerText }}
      </span>

      <div class="header-right">
        <span class="tagline">Ваше расписание всегда под рукой!</span>
        <button
          class="icon-btn"
          :title="theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'"
          @click="toggleTheme"
        >
          <!-- sun -->
          <svg v-if="theme === 'dark'" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <!-- moon -->
          <svg v-else viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 200;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--ds-border);
  /* Симметрично с .app-footer: padding на внешнем элементе. */
  padding: 0 20px;
}

[data-theme="dark"] .header {
  background: rgba(19, 26, 46, 0.95);
}

.header-inner {
  position: relative; /* для абсолютной центровки owner-chip */
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: var(--shadow-brand);
}

.brand-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.brand-title {
  font-family: var(--ds-font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--ds-fg);
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.brand-subtitle {
  font-size: 10px;
  color: var(--ds-fg-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Абсолютная центровка owner-chip по центру header-inner.
   Так он визуально сидит ровно по центру вьюпорта (header-inner центрирован
   через margin: 0 auto), независимо от ширины brand и header-right. */
.owner-chip {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: var(--r-full);
  background: var(--ds-accent-soft);
  border: 1px solid var(--ds-accent-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--ds-accent);
  white-space: nowrap;
  pointer-events: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tagline {
  font-size: 12px;
  color: var(--ds-fg-soft);
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ds-fg-soft);
  transition: all var(--d-fast);
  cursor: pointer;
  border: none;
  background: none;
}

.icon-btn:hover {
  background: var(--ds-surface-soft);
  color: var(--ds-fg);
}

.icon-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (min-width: 768px) {
  .header {
    padding: 0 100px;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 0 12px;
  }
  .tagline {
    display: none;
  }
  /* На узких экранах chip может перекрыть бренд — уменьшаем шрифт */
  .owner-chip {
    font-size: 11px;
    padding: 4px 10px;
  }
}

@media (max-width: 540px) {
  /* Совсем мало места — прячем chip, чтобы не наезжал на бренд */
  .owner-chip {
    display: none;
  }
}
</style>

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
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(28px) saturate(200%);
  -webkit-backdrop-filter: blur(28px) saturate(200%);
  padding: 0 20px;
  /* полноэкранный Telegram: статус-бар и кнопки Telegram сверху (utils/telegramViewport.ts) */
  padding-top: var(--tg-top-inset, 0px);
  box-shadow: 0 4px 32px rgba(26, 79, 219, 0.07), 0 1px 0 rgba(0, 0, 0, 0.04);
}

/* Градиентная линия снизу — как accent-полоса страницы */
.header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(26, 79, 219, 0.3) 20%,
    rgba(139, 92, 246, 0.3) 80%,
    transparent 100%
  );
}

[data-theme="dark"] .header {
  background: rgba(10, 14, 28, 0.85);
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .header::after {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(99, 132, 255, 0.25) 20%,
    rgba(167, 139, 250, 0.25) 80%,
    transparent 100%
  );
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
  width: 36px;
  height: 36px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow:
    0 2px 8px rgba(26, 79, 219, 0.25),
    0 0 0 1px rgba(26, 79, 219, 0.12);
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
  letter-spacing: -0.01em;
  line-height: 1.2;
  color: var(--ds-fg);
}

.brand-subtitle {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--ds-fg-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
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
  font-size: 11.5px;
  font-weight: 500;
  color: var(--ds-fg-faint);
  letter-spacing: 0.01em;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ds-fg-soft);
  transition: all var(--d-fast);
  cursor: pointer;
  border: 1px solid transparent;
  background: none;
}

.icon-btn:hover {
  background: var(--ds-surface-soft);
  border-color: var(--ds-border-strong);
  color: var(--ds-fg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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
    padding-inline: 100px;
  }
}

@media (max-width: 768px) {
  .header {
    padding-inline: 12px;
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

/* Полноэкранный Telegram (из профиля бота): сверху статус-бар, под ним строка
   кнопок Telegram — «Закрыть» слева, ⌄ ⋮ справа, середина свободна. Шапка не
   ставится под эту строку, а занимает её: бренд по центру, как заголовок
   нативного приложения; поля по бокам держат его между кнопками Telegram.
   Переключатель темы в строку не помещается — он висит круглой кнопкой справа
   под кнопками Telegram и едет вместе с липкой шапкой. Отступы —
   utils/telegramViewport.ts. */
html[data-tg-fullscreen] .header {
  padding-top: var(--tg-safe-top, 0px);
  padding-inline: 0; /* поля держит .header-inner — по кнопкам Telegram */
}
html[data-tg-fullscreen] .header-inner {
  height: var(--tg-content-top, 56px);
  /* кнопки Telegram: «Закрыть» ≈ 103px слева, ⌄ ⋮ ≈ 79px справа (Android, 360px) */
  padding-inline: 104px 80px;
  justify-content: center;
}
html[data-tg-fullscreen] .tagline,
html[data-tg-fullscreen] .brand-subtitle,
html[data-tg-fullscreen] .owner-chip {
  display: none;
}
html[data-tg-fullscreen] .brand {
  gap: 6px;
  min-width: 0;
  flex-shrink: 1;
}
html[data-tg-fullscreen] .brand-mark {
  width: 24px;
  height: 24px;
  border-radius: 7px;
}
html[data-tg-fullscreen] .brand-text {
  min-width: 0;
  overflow: hidden;
}
html[data-tg-fullscreen] .brand-title {
  font-size: 14px;
  max-width: 100%; /* .brand-text выравнивает по левому краю — без этого многоточие не сработает */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
html[data-tg-fullscreen] .header-right {
  position: absolute;
  top: calc(100% + 8px);
  right: 8px; /* по правому краю кнопки ⌄ ⋮ Telegram */
}
html[data-tg-fullscreen] .icon-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--r-full, 999px);
  color: var(--ds-fg);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-color: var(--ds-border-strong);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
}
html[data-theme="dark"][data-tg-fullscreen] .icon-btn {
  background: rgba(22, 28, 48, 0.85);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
}
html[data-tg-fullscreen] .icon-btn svg {
  width: 18px;
  height: 18px;
}

@media (max-width: 540px) {
  /* Совсем мало места — прячем chip, чтобы не наезжал на бренд */
  .owner-chip {
    display: none;
  }
}
</style>

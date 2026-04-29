<script setup lang="ts">
import VkIcon from '@/assets/VK.svg'
import TgIcon from '@/assets/TG.svg'
import MaxIcon from '@/assets/MAX.svg'

const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer">
    <div class="ft-inner">
      <!-- Левая часть: логотип ИМСИТ + описание -->
      <div class="ft-support">
        <img src="@/assets/imsit.png" class="ft-logo-img" alt="ИМСИТ" />
        <div class="ft-divider" aria-hidden="true" />
        <div class="ft-text">
          <span class="ft-text-title">При поддержке НАН ЧОУ ВО Академия ИМСИТ</span>
          <span class="ft-text-sub">Создано студентами для студентов и преподавателей</span>
        </div>
      </div>

      <!-- Правая часть: соцсети + копирайт + версия -->
      <div class="ft-right">
        <div class="ft-contacts">
          <span class="ft-contacts-lbl">Связаться с нами</span>
          <div class="ft-socials">
            <a
              class="soc soc-vk"
              href="https://vk.com/myacademy_app"
              target="_blank"
              rel="noopener"
              title="ВКонтакте"
              aria-label="ВКонтакте"
            >
              <img :src="VkIcon" alt="" aria-hidden="true" />
            </a>
            <a
              class="soc soc-max"
              href="https://max.ru/join/y_I8IQQy9njq-c8CVLnkpWDvQgZM0ogXyxAXFiMOl8Q"
              target="_blank"
              rel="noopener"
              title="MAX"
              aria-label="MAX"
            >
              <img :src="MaxIcon" alt="" aria-hidden="true" />
            </a>
            <a
              class="soc soc-tg"
              href="https://t.me/myacademy_app"
              target="_blank"
              rel="noopener"
              title="Telegram"
              aria-label="Telegram"
            >
              <img :src="TgIcon" alt="" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div class="ft-meta">
          <span class="ft-copy">© Моя Академия 2024–{{ currentYear }}</span>
          <span class="ft-dot" aria-hidden="true">·</span>
          <span class="ft-app">Электронное расписание</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  border-top: 1px solid var(--ds-border);
  background: var(--ds-surface);
  padding: 18px 20px;
}

.ft-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: center;
}

/* ─── Left: support ─── */
.ft-support {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.ft-logo-img {
  height: 50px;
  width: auto;
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;
}

.ft-divider {
  width: 1px;
  height: 36px;
  background: var(--ds-border-strong);
  flex-shrink: 0;
}

.ft-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ft-text-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ds-fg);
  line-height: 1.4;
}

.ft-text-sub {
  font-size: 11.5px;
  color: var(--ds-fg-soft);
  line-height: 1.4;
}

/* ─── Right: socials + meta ─── */
.ft-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.ft-contacts {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ft-contacts-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ds-fg-faint);
}

.ft-socials {
  display: flex;
  gap: 8px;
}

/* Соц-иконки — squircle с brand-марками. Сами SVG-файлы (VK/TG/MAX)
 * содержат скруглённый квадрат + лого. Контейнер только обрабатывает
 * lift + brand-glow на hover. */
.soc {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s var(--ease-out, ease),
    box-shadow 0.2s ease, filter 0.2s ease;
  /* Базовая тень — мягкая, чтобы иконки «лежали» на surface */
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.soc img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.soc:hover {
  transform: translateY(-2px) scale(1.05);
  /* Brand-coloured glow на hover */
  box-shadow: 0 4px 14px var(--soc-glow, rgba(15, 23, 42, 0.18));
}

.soc:active {
  transform: translateY(0) scale(0.98);
  transition-duration: 80ms;
}

/* Каждая платформа задаёт свой brand-glow цвет через CSS-переменную */
.soc-vk {
  --soc-glow: rgba(0, 119, 255, 0.4);
}

.soc-tg {
  --soc-glow: rgba(34, 158, 217, 0.4);
}

.soc-max {
  --soc-glow: rgba(139, 92, 246, 0.4);
}

/* Dark theme: тени мягче (на тёмной поверхности контраст и так высокий) */
[data-theme='dark'] .soc {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

[data-theme='dark'] .soc:hover {
  /* В dark mode сохраняем brand-glow */
  box-shadow: 0 4px 14px var(--soc-glow, rgba(0, 0, 0, 0.5));
}

@media (prefers-reduced-motion: reduce) {
  .soc {
    transition: box-shadow 0.15s ease;
  }
  .soc:hover {
    transform: none;
  }
}

.ft-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--ds-fg-faint);
}

.ft-copy {
  font-weight: 500;
}

.ft-dot {
  color: var(--ds-fg-faint);
  opacity: 0.6;
}

.ft-app {
  color: var(--ds-fg-soft);
}

/* ─── Desktop: расширяем padding по краям, чтобы блок не упирался в края ─── */
@media (min-width: 768px) {
  .app-footer {
    padding: 18px 100px;
  }
}

/* ─── Mobile: вертикальная раскладка с центровкой ─── */
@media (max-width: 768px) {
  .ft-inner {
    grid-template-columns: 1fr;
    gap: 16px;
    text-align: center;
  }

  .ft-support {
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .ft-divider {
    width: 36px;
    height: 1px;
  }

  .ft-text {
    align-items: center;
    text-align: center;
  }

  .ft-text-title {
    font-size: 12.5px;
  }

  .ft-right {
    align-items: center;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px solid var(--ds-border);
  }

  .ft-contacts {
    flex-direction: column;
    gap: 8px;
  }

  .ft-meta {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>

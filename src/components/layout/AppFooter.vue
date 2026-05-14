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

      <!-- Правая часть: соцсети + копирайт -->
      <div class="ft-right">
        <div class="ft-panel">
          <span class="ft-contacts-lbl">Связаться</span>
          <div class="ft-panel-sep" aria-hidden="true" />
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
          <span class="ft-dot" aria-hidden="true">·</span>
          <span class="ft-ie">ИП Симонян Димитри</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  position: relative;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(28px) saturate(200%);
  -webkit-backdrop-filter: blur(28px) saturate(200%);
  padding: 18px 20px;
  box-shadow: 0 -4px 32px rgba(26, 79, 219, 0.06), 0 -1px 0 rgba(0, 0, 0, 0.03);
}

/* Градиентная линия сверху — зеркало header::after */
.app-footer::before {
  content: '';
  position: absolute;
  top: 0;
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

[data-theme='dark'] .app-footer {
  background: rgba(10, 14, 28, 0.85);
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.35), 0 -1px 0 rgba(0, 0, 0, 0.2);
}

[data-theme='dark'] .app-footer::before {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(99, 132, 255, 0.25) 20%,
    rgba(167, 139, 250, 0.25) 80%,
    transparent 100%
  );
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
  font-size: 11px;
  color: var(--ds-fg-faint);
  line-height: 1.4;
}

/* ─── Right: socials + meta ─── */
.ft-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

/* Pill-контейнер объединяет лейбл + иконки в одну «таблетку» */
.ft-panel {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px 6px 14px;
  border-radius: var(--r-full);
  border: 1px solid var(--ds-border-strong);
  background: var(--ds-surface);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

[data-theme='dark'] .ft-panel {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.ft-contacts-lbl {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ds-fg-faint);
  white-space: nowrap;
}

.ft-panel-sep {
  width: 1px;
  height: 16px;
  background: var(--ds-border-strong);
  flex-shrink: 0;
}

[data-theme='dark'] .ft-panel-sep {
  background: rgba(255, 255, 255, 0.1);
}

.ft-socials {
  display: flex;
  gap: 4px;
}

.soc {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s var(--ease-out, ease),
    box-shadow 0.2s ease, opacity 0.2s ease;
  opacity: 0.85;
}

.soc img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.soc:hover {
  transform: translateY(-2px) scale(1.08);
  opacity: 1;
  box-shadow: 0 4px 12px var(--soc-glow, rgba(15, 23, 42, 0.2));
}

.soc:active {
  transform: translateY(0) scale(0.96);
  transition-duration: 80ms;
}

.soc-vk  { --soc-glow: rgba(0, 119, 255, 0.35); }
.soc-tg  { --soc-glow: rgba(34, 158, 217, 0.35); }
.soc-max { --soc-glow: rgba(139, 92, 246, 0.35); }

[data-theme='dark'] .soc {
  opacity: 0.75;
}

[data-theme='dark'] .soc:hover {
  opacity: 1;
  box-shadow: 0 4px 14px var(--soc-glow, rgba(0, 0, 0, 0.4));
}

@media (prefers-reduced-motion: reduce) {
  .soc { transition: opacity 0.15s ease; }
  .soc:hover { transform: none; }
}

.ft-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  color: var(--ds-fg-faint);
  letter-spacing: 0.01em;
}

.ft-copy {
  font-weight: 600;
}

.ft-dot {
  opacity: 0.4;
}

.ft-app {
  color: var(--ds-fg-faint);
}

.ft-ie {
  color: var(--ds-fg-faint);
}

/* ─── Desktop: расширяем padding по краям, чтобы блок не упирался в края ─── */
@media (min-width: 768px) {
  .app-footer {
    padding: 18px 100px;
  }
}

/* ─── Mobile: вертикальная центровка ─── */
@media (max-width: 768px) {
  .ft-inner {
    grid-template-columns: 1fr;
    gap: 12px;
    text-align: center;
  }

  .ft-support {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .ft-logo-img {
    height: 58px;
  }

  .ft-divider {
    display: none;
  }

  .ft-text {
    align-items: center;
    text-align: center;
    gap: 1px;
  }

  .ft-text-title {
    font-size: 11px;
  }

  .ft-text-sub {
    font-size: 10px;
  }

  .ft-right {
    align-items: center;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--ds-border);
  }

  .ft-panel {
    flex-direction: row;
    padding: 5px 8px 5px 12px;
    border-radius: var(--r-full);
  }

  .ft-panel-sep {
    width: 1px;
    height: 14px;
  }

  .ft-meta {
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 10.5px;
  }

  /* На мобиле прячем разделители — переносы сами дают структуру */
  .ft-meta .ft-dot {
    display: none;
  }

  .ft-meta {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>

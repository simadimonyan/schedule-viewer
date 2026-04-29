<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function handleBackdropClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.classList.contains('legend-ov')) close()
}
</script>

<template>
  <div class="legend-tab" aria-label="Обозначения">
    <button class="legend-tab-btn" type="button" @click="toggle">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(90deg)">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8h.01M12 12v4"/>
      </svg>
      Обозначения
    </button>
  </div>

  <Teleport to="body">
    <Transition name="legend">
      <div v-if="open" class="legend-ov" @click="handleBackdropClick">
        <div class="legend-modal" role="dialog" aria-label="Условные обозначения">
          <button class="legend-x" type="button" aria-label="Закрыть" @click="close">
            <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div class="legend-title">Условные обозначения</div>
          <div class="legend-sub">Типы занятий в расписании ИМСИТ</div>

          <div class="legend-item">
            <div class="legend-stripe" style="background:var(--lesson-lecture)" />
            <div class="legend-info">
              <div class="legend-type">Лекция</div>
              <div class="legend-desc">Теоретический курс, весь поток</div>
              <span class="legend-chip" style="background:var(--lesson-lecture-soft);color:var(--lesson-lecture)">Лекция</span>
            </div>
          </div>

          <div class="legend-item">
            <div class="legend-stripe" style="background:var(--lesson-practice)" />
            <div class="legend-info">
              <div class="legend-type">Практика</div>
              <div class="legend-desc">Практические занятия, подгруппы</div>
              <span class="legend-chip" style="background:var(--lesson-practice-soft);color:var(--lesson-practice)">Практика</span>
            </div>
          </div>

          <div class="legend-item">
            <div class="legend-stripe" style="background:var(--lesson-lab)" />
            <div class="legend-info">
              <div class="legend-type">Лабораторная</div>
              <div class="legend-desc">Лабораторные работы, подгруппы</div>
              <span class="legend-chip" style="background:var(--lesson-lab-soft);color:var(--lesson-lab)">Лаб.</span>
            </div>
          </div>

          <div class="legend-item">
            <div class="legend-stripe" style="background:var(--lesson-exam)" />
            <div class="legend-info">
              <div class="legend-type">Экзамен / Зачёт</div>
              <div class="legend-desc">Контрольные и итоговые мероприятия</div>
              <span class="legend-chip" style="background:var(--lesson-exam-soft);color:var(--lesson-exam)">Экзамен</span>
            </div>
          </div>

          <div class="legend-item">
            <div class="legend-stripe" style="background:var(--lesson-intro)" />
            <div class="legend-info">
              <div class="legend-type">Вводное занятие</div>
              <div class="legend-desc">Установочные и ознакомительные занятия</div>
              <span class="legend-chip" style="background:var(--lesson-intro-soft);color:var(--lesson-intro)">Вводное</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Floating tab on the right edge.
   Раньше right:0 + border-right:0 — на некоторых системах с overlay-скроллом
   полоса оставалась практически невидимой. Теперь tab чуть выдвинут от края,
   с акцентом цветом, чтобы не «уходил за экран». */
.legend-tab {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 300;
}

.legend-tab-btn {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 16px 10px;
  /* По умолчанию — solid accent с белым текстом, чтобы tab был
     максимально заметен на любом фоне (раньше был blend-цвет
     accent-soft и просто терялся в светлой теме). */
  background: var(--ds-accent);
  border: 1px solid var(--ds-accent);
  border-right: 0;
  border-radius: var(--r-md) 0 0 var(--r-md);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  cursor: pointer;
  box-shadow: var(--shadow-brand), var(--shadow-md);
  transition: transform 0.15s, padding 0.15s, background 0.15s;
}

.legend-tab-btn:hover {
  background: var(--brand-primary-h);
  transform: translateX(-3px);
  padding-right: 13px;
}

.legend-tab-btn svg {
  /* Контрастная иконка-инфо */
  opacity: 0.9;
}

/* Modal overlay */
.legend-ov {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(6px);
}

.legend-modal {
  position: relative;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--r-2xl);
  padding: 24px;
  width: 340px;
  max-width: 92vw;
  box-shadow: var(--shadow-xl);
}

.legend-title {
  font-family: var(--ds-font-display);
  font-size: 16px;
  font-weight: 800;
  color: var(--ds-fg);
  margin-bottom: 4px;
  letter-spacing: -0.01em;
}

.legend-sub {
  font-size: 12px;
  color: var(--ds-fg-faint);
  margin-bottom: 18px;
}

.legend-x {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  background: var(--ds-surface-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ds-fg-faint);
  cursor: pointer;
  transition: background 0.12s;
  border: none;
}

.legend-x:hover {
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
}

.legend-x svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--ds-border);
}

.legend-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.legend-stripe {
  width: 5px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
}

.legend-stripe-current {
  width: 5px;
  height: 36px;
  border-radius: 4px;
  border: 2px dashed #1A4FDB;
  background: transparent;
  box-shadow: 0 0 0 3px rgba(26, 79, 219, 0.1);
}

.legend-info {
  flex: 1;
}

.legend-type {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ds-fg);
}

.legend-desc {
  font-size: 11.5px;
  color: var(--ds-fg-soft);
  margin-top: 2px;
}

.legend-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--r-full);
  font-size: 10px;
  font-weight: 600;
  margin-top: 4px;
}

/* Animations */
.legend-enter-active,
.legend-leave-active {
  transition: opacity 0.25s ease;
}

.legend-enter-active .legend-modal,
.legend-leave-active .legend-modal {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}

.legend-enter-from,
.legend-leave-to {
  opacity: 0;
}

.legend-enter-from .legend-modal,
.legend-leave-to .legend-modal {
  transform: scale(0.92) translateY(16px);
  opacity: 0;
}

@media (max-width: 640px) {
  .legend-tab {
    display: none;
  }
}
</style>

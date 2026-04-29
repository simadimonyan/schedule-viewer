<script setup lang="ts">
import { computed } from 'vue'
import OnlineCard from './OnlineCard.vue'
import TopList from './TopList.vue'
import { getWeekParity } from '../../utils/date'

withDefaults(
  defineProps<{
    mode?: 'group' | 'teacher'
  }>(),
  { mode: 'group' },
)

/* Чётность текущей недели — десктоп показывает чип рядом с online-pill */
const currentWeekParity = computed(() => getWeekParity(new Date()))
const parityLabel = computed(() =>
  currentWeekParity.value === 1 ? 'Нечётная неделя' : 'Чётная неделя',
)
</script>

<template>
  <!-- Online + Parity — закреплены в правом верхнем углу под header'ом -->
  <div class="fixed-online" aria-label="Онлайн пользователи">
    <OnlineCard compact />
    <span
      class="parity-chip"
      :class="`parity-${currentWeekParity}`"
      :title="`Сейчас идёт ${parityLabel.toLowerCase()}`"
    >
      <span class="parity-dot" />
      <span class="parity-text">{{ parityLabel }}</span>
    </span>
  </div>

  <!-- Top groups — слева по центру -->
  <aside class="fixed-top" aria-label="Топ групп">
    <TopList :mode="mode" />
  </aside>
</template>

<style scoped>
.fixed-online {
  position: fixed;
  top: 72px;
  right: 20px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fade-in 0.4s var(--ease-out);
}

/* ─── Parity chip (рядом с online-pill, единый стиль с mobile) ─── */
.parity-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--r-full);
  background: var(--ds-surface);
  border: 1px solid var(--ds-border-strong);
  box-shadow: var(--shadow-sm);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ds-fg-muted);
  white-space: nowrap;
  cursor: default;
  user-select: none;
}

.parity-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ds-accent);
  flex-shrink: 0;
}

.parity-1 {
  background: var(--ds-accent-soft);
  border-color: var(--ds-accent-border);
  color: var(--ds-accent);
}

.parity-1 .parity-dot {
  background: var(--ds-accent);
}

.parity-2 {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  color: var(--violet);
}

.parity-2 .parity-dot {
  background: var(--violet);
}

[data-theme='dark'] .parity-2 {
  background: rgba(167, 139, 250, 0.14);
  border-color: rgba(167, 139, 250, 0.32);
  color: #A78BFA;
}

[data-theme='dark'] .parity-2 .parity-dot {
  background: #A78BFA;
}

.fixed-top {
  position: fixed;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
  width: 220px;
  animation: fade-in 0.4s var(--ease-out);
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* В .fixed-top анимация без translateY (он используется для центровки) */
.fixed-top {
  animation: fade-in-left 0.4s var(--ease-out);
}

@keyframes fade-in-left {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
}

@media (max-width: 1200px) {
  .fixed-online,
  .fixed-top {
    display: none;
  }
}
</style>

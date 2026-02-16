<script setup lang="ts">
const props = defineProps<{
  label: string
  serverWeekLabel?: string
  serverWeekCount?: number | null
  selectedWeekCount?: number | null
  canGoPrev?: boolean
  canGoNext?: boolean
}>()

const emit = defineEmits<{
  (e: 'change'): void
}>()

const onNext = () => {
  if (props.canGoNext !== false) emit('change')
}
</script>

<template>
  <div class="switcher">
    <div class="left">
      <div class="label">
        {{ label }}
      </div>
      <div v-if="serverWeekLabel" class="sub">
        Сейчас: <span class="pill">{{ serverWeekLabel }}</span>
      </div>
    </div>

    <button
      type="button"
      class="btn primary"
      @click="onNext"
    >
      Переключить неделю
    </button>
  </div>
</template>

<style scoped>
.switcher {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  border-radius: var(--radiusLg);
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.left {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.label {
  font-size: 0.85rem;
  font-weight: 500;
}

.sub {
  font-size: 0.78rem;
  color: var(--muted);
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--primaryBorder);
  background: var(--primarySoft);
  color: var(--text);
  font-weight: 500;
}

.btn {
  border-radius: 999px;
  border: 1px solid var(--border);
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  color: var(--text);
  background: transparent;
  cursor: pointer;
}

.btn.primary {
  border-color: transparent;
  background: var(--primary);
  color: #ffffff;
}

@media (max-width: 639px) {
  .switcher {
    flex-direction: column;
    align-items: stretch;
  }

  .label {
    text-align: center;
  }
}
</style>


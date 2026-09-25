<script setup lang="ts">
/* Подпись, пример и ошибка вокруг одного поля формы обращения. */
defineProps<{
  id: string
  label: string
  hint?: string
  error?: string
  optional?: boolean
}>()
</script>

<template>
  <div class="rf" :class="{ 'has-error': !!error }">
    <label class="rf-label" :for="id">
      {{ label }}
      <span v-if="optional" class="rf-opt">необязательно</span>
    </label>
    <slot />
    <p v-if="error" :id="`${id}-err`" class="rf-error" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="rf-hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.rf { display: flex; flex-direction: column; gap: 6px; }
.rf-label { font-size: 14px; font-weight: 600; color: var(--ds-fg); }
.rf-opt { margin-left: 6px; font-size: 12px; font-weight: 400; color: var(--ds-fg-soft); }
.rf-hint,
.rf-error { margin: 0; font-size: 12px; line-height: 1.45; }
.rf-hint { color: var(--ds-fg-soft); }
.rf-error { color: #DC2626; }
[data-theme='dark'] .rf-error { color: #FB7185; }

.rf :slotted(.rf-input) {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--ds-border-strong);
  border-radius: var(--r-md);
  background: var(--ds-surface);
  color: var(--ds-fg);
  font: inherit;
  font-size: 15px;
  line-height: 1.45;
  transition: border-color var(--d-fast) ease, box-shadow var(--d-fast) ease;
}
.rf :slotted(textarea.rf-input) { min-height: 112px; resize: vertical; }
.rf :slotted(.rf-input::placeholder) { color: var(--ds-fg-faint); }
.rf :slotted(.rf-input:focus) { outline: none; border-color: var(--ds-accent); box-shadow: var(--shadow-focus); }
.rf :slotted(.rf-input:disabled) { opacity: 0.6; }
.rf.has-error :slotted(.rf-input) { border-color: #DC2626; }
[data-theme='dark'] .rf.has-error :slotted(.rf-input) { border-color: #FB7185; }
</style>

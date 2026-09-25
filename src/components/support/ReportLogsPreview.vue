<script setup lang="ts">
import { computed, ref } from 'vue'
import { buildLogsPayload } from '../../utils/clientLogs'

/* Прозрачность: человек видит ровно тот logs.json, который уйдёт с
 * обращением. Снимок берётся при раскрытии, а не на каждый рендер. */

const enabled = defineModel<boolean>({ required: true })
defineProps<{ disabled: boolean }>()

const expanded = ref(false)
const snapshot = ref('')

const entriesCount = computed(() => (snapshot.value ? (JSON.parse(snapshot.value) as { entries: unknown[] }).entries.length : 0))

function toggle(): void {
  expanded.value = !expanded.value
  if (expanded.value) snapshot.value = JSON.stringify(buildLogsPayload(), null, 1)
}
</script>

<template>
  <div class="logs">
    <label class="logs-check">
      <input v-model="enabled" type="checkbox" :disabled="disabled" />
      <span class="logs-text">
        <span class="logs-title">Приложить технические логи</span>
        <span class="logs-sub">Модель браузера, размер экрана, ошибки и запросы к расписанию за этот сеанс. Без паролей и личных данных.</span>
      </span>
    </label>
    <button type="button" class="logs-toggle" :aria-expanded="expanded" @click="toggle">
      <v-icon :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="18" />
      {{ expanded ? 'Скрыть' : 'Посмотреть, что уйдёт' }}
    </button>
    <div v-if="expanded" class="logs-preview">
      <p class="logs-count">{{ entriesCount }} записей журнала{{ enabled ? '' : ' — сейчас не отправятся' }}</p>
      <pre>{{ snapshot }}</pre>
    </div>
  </div>
</template>

<style scoped>
.logs { display: flex; flex-direction: column; gap: 6px; }
.logs-check { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
.logs-check input {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  flex-shrink: 0;
  accent-color: var(--ds-accent);
  cursor: pointer;
}
.logs-text { display: flex; flex-direction: column; gap: 2px; }
.logs-title { font-size: 14px; font-weight: 500; color: var(--ds-fg); }
.logs-sub { font-size: 12px; line-height: 1.45; color: var(--ds-fg-soft); }
.logs-toggle {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 22px;
  padding: 4px 6px;
  border: none;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ds-accent-ink, var(--ds-accent));
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.logs-toggle:hover { background: var(--ds-accent-soft); }
.logs-toggle:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.logs-preview { margin-left: 28px; }
.logs-count { margin: 0 0 4px; font-size: 12px; color: var(--ds-fg-soft); }
.logs-preview pre {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  padding: 10px 12px;
  border: 1px solid var(--ds-border);
  border-radius: var(--r-md);
  background: var(--ds-surface-sunk);
  color: var(--ds-fg-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

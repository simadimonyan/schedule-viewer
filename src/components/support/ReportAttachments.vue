<script setup lang="ts">
import { ref } from 'vue'
import { SUPPORT_LIMITS } from '../../api/support'
import type { Attachment } from './useReportForm'

const props = defineProps<{
  items: Attachment[]
  totalBytes: number
  error: string
  disabled: boolean
}>()

const emit = defineEmits<{
  add: [files: File[]]
  remove: [id: number]
}>()

const input = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
}

function onPick(e: Event): void {
  const target = e.target as HTMLInputElement
  if (target.files?.length) emit('add', Array.from(target.files))
  target.value = ''
}

function onDrop(e: DragEvent): void {
  dragOver.value = false
  if (props.disabled) return
  if (e.dataTransfer?.files.length) emit('add', Array.from(e.dataTransfer.files))
}

const full = () => props.items.length >= SUPPORT_LIMITS.maxFiles
</script>

<template>
  <div class="att">
    <button
      v-if="!full()"
      type="button"
      class="att-drop"
      :class="{ 'is-over': dragOver }"
      :disabled="disabled"
      @click="input?.click()"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onDrop"
    >
      <v-icon icon="mdi-paperclip" size="18" />
      <span>Прикрепить фото или видео</span>
      <span class="att-hint">до {{ SUPPORT_LIMITS.maxFiles }} файлов, вместе до 45 МБ</span>
    </button>
    <input
      ref="input"
      type="file"
      accept="image/*,video/*"
      multiple
      hidden
      @change="onPick"
    />

    <ul v-if="items.length" class="att-list">
      <li v-for="item in items" :key="item.id" class="att-item">
        <img v-if="item.file.type.startsWith('image/')" :src="item.preview" alt="" class="att-thumb" />
        <span v-else class="att-thumb att-thumb--video"><v-icon icon="mdi-play" size="20" /></span>
        <span class="att-meta">
          <span class="att-name">{{ item.file.name }}</span>
          <span class="att-size">{{ formatSize(item.file.size) }}</span>
        </span>
        <button
          type="button"
          class="att-remove"
          :disabled="disabled"
          :aria-label="`Убрать ${item.file.name}`"
          @click="emit('remove', item.id)"
        >
          <v-icon icon="mdi-close" size="18" />
        </button>
      </li>
      <li class="att-total">{{ items.length }} из {{ SUPPORT_LIMITS.maxFiles }} · {{ formatSize(totalBytes) }} из 45 МБ</li>
    </ul>

    <p v-if="error" class="att-error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.att { display: flex; flex-direction: column; gap: 8px; }

.att-drop {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px dashed var(--ds-border-strong);
  border-radius: var(--r-md);
  background: var(--ds-surface-soft);
  color: var(--ds-fg-muted);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--d-fast) ease, background var(--d-fast) ease;
}
.att-drop:hover:not(:disabled),
.att-drop.is-over { border-color: var(--ds-accent); background: var(--ds-accent-soft); color: var(--ds-fg); }
.att-drop:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.att-drop:disabled { opacity: 0.6; cursor: default; }
.att-hint { flex-basis: 100%; font-size: 12px; color: var(--ds-fg-soft); }

.att-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.att-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 6px 6px;
  border: 1px solid var(--ds-border);
  border-radius: var(--r-md);
  background: var(--ds-surface);
}
.att-thumb {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--r-sm);
  object-fit: cover;
  background: var(--ds-surface-sunk);
}
.att-thumb--video { display: inline-flex; align-items: center; justify-content: center; color: var(--ds-fg-muted); }
.att-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.att-name { font-size: 13px; color: var(--ds-fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.att-size { font-size: 12px; color: var(--ds-fg-soft); }
.att-remove {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ds-fg-soft);
  cursor: pointer;
}
.att-remove:hover:not(:disabled) { background: var(--ds-surface-sunk); color: var(--ds-fg); }
.att-remove:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.att-total { font-size: 12px; color: var(--ds-fg-soft); padding: 0 2px; }
.att-error { margin: 0; font-size: 13px; color: var(--red); }
[data-theme='dark'] .att-error { color: #FB7185; }
</style>

<script setup lang="ts">
import type { EmptyIllustration } from './emptyIllustrations'

withDefaults(defineProps<{ kind: EmptyIllustration; size?: number }>(), { size: 160 })
const base = import.meta.env.BASE_URL
</script>

<template>
  <img
    class="empty-illustration"
    :src="`${base}illustrations/${kind}.webp`"
    :width="size"
    :height="size"
    alt=""
    aria-hidden="true"
    decoding="async"
  />
</template>

<style scoped>
.empty-illustration {
  display: block;
  flex-shrink: 0;
  max-width: 100%;
  object-fit: contain;
  margin-inline: auto;
}
</style>

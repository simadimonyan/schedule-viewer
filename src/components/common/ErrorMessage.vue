<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <div class="error">
    <span class="badge">Ошибка</span>
    <p class="text">
      {{ message }}
    </p>
  </div>
</template>

<style scoped>
.error {
  border-radius: 0.75rem;
  border: 1px solid rgba(248, 113, 113, 0.7);
  background: rgba(127, 29, 29, 0.4);
  padding: 0.6rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.78rem;
  color: #fee2e2;
}

.badge {
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(248, 113, 113, 0.9);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.text {
  margin: 0;
}
</style>


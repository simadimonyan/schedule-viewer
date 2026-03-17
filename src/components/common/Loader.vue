<template>
  <div class="loader" aria-label="Загрузка">
    <span class="spinner" />
  </div>
</template>

<style scoped>
.loader {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid rgba(37, 99, 235, 0.2);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>


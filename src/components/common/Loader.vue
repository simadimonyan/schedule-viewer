<template>
  <div class="loader">
    <span class="dot" />
    <span class="dot" />
    <span class="dot" />
    <span class="label">Загружаем расписание…</span>
  </div>
</template>

<style scoped>
.loader {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #9ca3af;
}

.dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 999px;
  background: #60a5fa;
  animation: pulse 1.2s infinite ease-in-out;
}

.dot:nth-child(2) {
  animation-delay: 0.15s;
}

.dot:nth-child(3) {
  animation-delay: 0.3s;
}

.label {
  margin-left: 0.15rem;
}

@keyframes pulse {
  0%,
  80%,
  100% {
    opacity: 0.2;
    transform: scale(0.9);
  }
  40% {
    opacity: 1;
    transform: scale(1.2);
  }
}
</style>


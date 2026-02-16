<template>
  <footer class="footer">
    <div class="footer-inner">
      <span class="footer-text">
        Университетское расписание · Schedule Viewer
      </span>
      <span class="footer-subtext">
        Данные загружаются из внешнего API · время отображается локально
      </span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--border);
  background: transparent;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--muted);
}

.footer-text {
  font-weight: 500;
}

.footer-subtext {
  opacity: 0.8;
}

@media (min-width: 768px) {
  .footer-inner {
    padding: 0.9rem 1.5rem 1.4rem;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>


<script setup lang="ts">
  const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="footer">
    <div class="footer-inner">
      <div class="support">
        <img src="@/assets/imsit.png" weight="100" height="60" class="logo">
        <span class="divider"></span>
        <div>
          <span class="footer-subtext">
            <b>при поддержке <br>
            НАН ЧОУ ВО Академия ИМСИТ</b> <br>
            Создано студетами для студентов и преподавателей
          </span>
        </div>
      </div>
      <div class="about">
        <div class="contacts">
          <a href="https://vk.com/myacademy_app" target="_blank" class="social-btn">
            <img src="@/assets/VK.svg" alt="VK">
          </a>
          <a href="https://max.ru/join/y_I8IQQy9njq-c8CVLnkpWDvQgZM0ogXyxAXFiMOl8Q" target="_blank" class="social-btn">
            <img src="@/assets/MAX.svg" alt="VK">
          </a>
          <a href="https://t.me/myacademy_app" target="_blank" class="social-btn">
            <img src="@/assets/TG.svg" alt="VK">
          </a>
        </div>

        <span class="footer-text">
          Электронное расписание <br>
          <b>© Моя Академия 2024-{{ currentYear }}</b>
        </span>
      </div>
    </div>
  </footer>
</template>

<style scoped>

.footer {
  border-top: 0px solid var(--buttons);
  background: var(--footer)
}

.footer-inner {
  width: 100%;
  padding: 0.65rem 20px 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text);
}

.support {
  display: flex;
  flex-direction: row;
}

.logo {
  margin-right: 0.75rem;
}

.divider {
  width: 2px;          
  height: 4rem;            
  background: var(--border);
  margin-right: 1rem;
}

.social-btn:not(:last-child) {
  margin-right: 0.75rem;
}

.footer-text {
  font-weight: 350;
}

.footer-subtext {
  opacity: 0.9;
}

@media (min-width: 768px) {
  .footer-inner {
    padding: 0.8rem 100px 1.25rem;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>


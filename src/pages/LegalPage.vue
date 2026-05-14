<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isPrivacy = computed(() => route.name === 'privacy')

const title = computed(() =>
  isPrivacy.value ? 'Политика конфиденциальности' : 'Пользовательское соглашение',
)
</script>

<template>
  <section class="legal-page">
    <div class="legal-shell">
      <h1>{{ title }}</h1>

      <template v-if="isPrivacy">
        <p>
          Сервис «Моя Академия - ИМСИТ» показывает расписание групп и преподавателей.
          Мы используем только данные, необходимые для работы интерфейса: выбранные
          фильтры, недавно открытые расписания, тему оформления, технические события
          аналитики и согласие на cookie.
        </p>
        <h2>Какие данные сохраняются</h2>
        <p>
          В браузере могут храниться выбранный режим поиска, курс, уровень,
          последние расписания и кеш ответов API. Эти данные помогают быстрее
          открыть расписание и не вводить одно и то же повторно.
        </p>
        <h2>Cookie и аналитика</h2>
        <p>
          Cookie и похожие технологии используются для стабильной работы сайта,
          сохранения пользовательских настроек и обезличенной статистики
          использования. Вы можете очистить эти данные в настройках браузера.
        </p>
        <h2>Передача данных</h2>
        <p>
          Мы не продаём персональные данные. Запросы расписания отправляются на
          сервер расписания, а технические события могут использоваться для
          улучшения качества сервиса.
        </p>
      </template>

      <template v-else>
        <p>
          Пользуясь сервисом, вы соглашаетесь применять его для просмотра учебного
          расписания и связанных с ним справочных данных.
        </p>
        <h2>Доступность расписания</h2>
        <p>
          Расписание может обновляться, временно быть недоступным или отличаться
          от информации в официальных источниках. Перед важными занятиями
          проверяйте актуальность данных.
        </p>
        <h2>Допустимое использование</h2>
        <p>
          Нельзя мешать работе сервиса, автоматически перегружать API запросами,
          пытаться получить не предназначенные для вас данные или использовать
          интерфейс способом, который нарушает законодательство.
        </p>
        <h2>Изменения условий</h2>
        <p>
          Условия могут обновляться вместе с развитием сервиса. Актуальная версия
          всегда доступна на этой странице.
        </p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.legal-page {
  flex: 1;
  padding: 28px 0 48px;
}

.legal-shell {
  max-width: 760px;
  margin: 0 auto;
  padding: 28px;
  border: 1px solid var(--ds-border);
  border-radius: var(--r-xl);
  background: var(--ds-surface);
  box-shadow: var(--shadow-sm);
}

h1 {
  font-family: var(--ds-font-display);
  font-size: clamp(1.7rem, 4vw, 2.35rem);
  line-height: 1.12;
  margin-bottom: 18px;
  color: var(--ds-fg);
}

h2 {
  font-family: var(--ds-font-display);
  font-size: 1.05rem;
  margin: 22px 0 8px;
  color: var(--ds-fg);
}

p {
  color: var(--ds-fg-soft);
  font-size: 15px;
  line-height: 1.7;
}

@media (max-width: 640px) {
  .legal-page {
    padding: 16px 0 32px;
  }

  .legal-shell {
    margin: 0 -8px;
    padding: 22px 18px;
    border-radius: var(--r-lg);
  }
}
</style>

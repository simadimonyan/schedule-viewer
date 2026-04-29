import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import { routes } from './router'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

import { EVENTS, trackGoal, trackPageView } from './utils/analytics'

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

/* SPA-переходы — шлём pageView и трекаем семантические события
 * "Перейти на главный экран" / "Перейти на экран расписания".
 *
 * Первый pageView (initial load) уже отправлен из <script> в index.html
 * до того, как Vue смонтировался — здесь мы трекаем только последующие
 * клиентские переходы. */
let isFirstNav = true
router.afterEach((to) => {
  // Стартовая навигация — index.html уже сделал pageView, дублировать
  // не нужно. Зато goto-event для корректного входа в воронку отправляем.
  if (!isFirstNav) {
    trackPageView(window.location.href)
  }
  isFirstNav = false

  if (to.name === 'home') {
    trackGoal(EVENTS.GOTO_HOME)
  } else if (to.name === 'group-schedule' || to.name === 'teacher-schedule') {
    trackGoal(EVENTS.GOTO_SCHEDULE, {
      mode: to.name === 'group-schedule' ? 'group' : 'teacher',
    })
  }
})

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  components,
  directives,
})

createApp(App).use(router).use(vuetify).mount('#app')

<script setup lang="ts">
import EntitySearch from '../components/filters/EntitySearch.vue'
import HomeSidebar from '../components/home/HomeSidebar.vue'
import OnlineCard from '../components/home/OnlineCard.vue'
import TopList from '../components/home/TopList.vue'
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getWeekParity } from '../utils/date'
import { EVENTS, trackGoal } from '../utils/analytics'

type Mode = 'group' | 'teacher'

const router = useRouter()
const RECENT_KEY = 'recent_schedules'
const SEARCH_MODE_KEY = 'search_mode'
const recent = ref<Array<{ type: Mode; id: string }>>([])

/* Shared search mode — синхронизируется между EntitySearch (плашка
 * Группы / Преподаватели) и Top-листом (десктоп: HomeSidebar, мобайл:
 * inline-TopList). Сохраняем выбор в localStorage, чтобы пользователь
 * вернулся в тот же режим. */
const searchMode = ref<Mode>('group')

/* Чётность текущей недели — 1 (нечётная) / 2 (чётная).
 * getWeekParity возвращает 1 для нечётных недель года, 2 для чётных. */
const currentWeekParity = computed(() => getWeekParity(new Date()))
const parityLabel = computed(() =>
  currentWeekParity.value === 1 ? 'Нечётная неделя' : 'Чётная неделя',
)

/* Состояние фокуса поиска — пробрасывается из EntitySearch. Когда true,
 * добавляем класс на .home, чтобы CSS заблюрил «плавающие» блоки
 * (online + parity + top), концентрируя внимание на dropdown'е. */
const searchFocused = ref(false)

/* ─── Icon rain ───
 * Множество schedule-related иконок плавно «падают» сверху вниз как дождь.
 * Каждая иконка получает рандомизированную позицию/длительность/задержку,
 * чтобы создать естественный эффект (не синхронный шторм). Генерируется
 * один раз в setup и не пересоздаётся при ре-рендере. */
type RainIcon = {
  id: number
  type: 'cal' | 'clock' | 'book' | 'cap' | 'pencil' | 'star'
  left: number          // % от ширины
  size: number          // px
  duration: number      // s
  delay: number         // s (отрицательный — старт «уже в полёте»)
  rotation: number      // deg, начальный поворот
  drift: number         // px, горизонтальный сдвиг (легкий парашют)
  opacity: number       // 0-1
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

const RAIN_TYPES: RainIcon['type'][] = ['cal', 'clock', 'book', 'cap', 'pencil', 'star']

const rainIcons = computed<RainIcon[]>(() => {
  const count = 18
  const items: RainIcon[] = []
  for (let i = 0; i < count; i++) {
    items.push({
      id: i,
      type: RAIN_TYPES[i % RAIN_TYPES.length]!,
      left: rand(2, 96),
      size: rand(22, 44),
      duration: rand(14, 28),
      delay: -rand(0, 25),
      rotation: rand(-20, 20),
      drift: rand(-20, 20),
      opacity: rand(0.05, 0.13),
    })
  }
  return items
})

onMounted(() => {
  const raw = localStorage.getItem(RECENT_KEY)
  if (raw) {
    try {
      recent.value = JSON.parse(raw) as Array<{ type: Mode; id: string }>
    } catch {}
  }

  const savedMode = localStorage.getItem(SEARCH_MODE_KEY)
  if (savedMode === 'teacher' || savedMode === 'group') {
    searchMode.value = savedMode
  }
})

/* Сохраняем выбранный режим (группа/преподаватель) в localStorage,
 * чтобы после перезагрузки страницы пользователь видел тот же top. */
watch(searchMode, (next) => {
  try {
    localStorage.setItem(SEARCH_MODE_KEY, next)
  } catch {}
})

/* Recent-чип: переход в расписание из блока "Недавно просматривали".
 * Трекаем тот же `SELECT_GROUP/TEACHER`, но с параметром `from='recent'`,
 * чтобы в дашборде можно было разделить переходы из поиска и из recent. */
function openRecent(r: { type: Mode; id: string }) {
  if (r.type === 'group') {
    trackGoal(EVENTS.SELECT_GROUP, { groupName: r.id, from: 'recent' })
    router.push({ name: 'group-schedule', params: { groupId: r.id } })
  } else {
    trackGoal(EVENTS.SELECT_TEACHER, { teacherName: r.id, from: 'recent' })
    router.push({ name: 'teacher-schedule', params: { teacherId: r.id } })
  }
}
</script>

<template>
  <section class="home" :class="{ 'is-search-active': searchFocused }">
    <div class="home-grid-bg" aria-hidden="true" />

    <!-- Декоративные фоновые элементы:
         — blur-blob'ы (мягкие облака бренд-цвета как фон)
         — icon-rain: schedule-related иконки плавно падают сверху вниз
         Всё aria-hidden + pointer-events: none. -->
    <div class="home-decor" aria-hidden="true">
      <span class="decor-blob decor-blob-1" />
      <span class="decor-blob decor-blob-2" />
      <span class="decor-blob decor-blob-3" />

      <!-- Icon rain — массив падающих иконок -->
      <div class="icon-rain">
        <span
          v-for="icon in rainIcons"
          :key="icon.id"
          class="rain-drop"
          :class="`rain-${icon.type}`"
          :style="{
            left: `${icon.left}%`,
            width: `${icon.size}px`,
            height: `${icon.size}px`,
            opacity: icon.opacity,
            '--rain-duration': `${icon.duration}s`,
            '--rain-delay': `${icon.delay}s`,
            '--rain-rot': `${icon.rotation}deg`,
            '--rain-drift': `${icon.drift}px`,
          }"
        >
          <svg v-if="icon.type === 'cal'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <svg v-else-if="icon.type === 'clock'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <svg v-else-if="icon.type === 'book'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <svg v-else-if="icon.type === 'cap'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
          <svg v-else-if="icon.type === 'pencil'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"/>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
            <path d="M2 2l7.586 7.586"/>
            <circle cx="11" cy="11" r="2"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </span>
      </div>
    </div>

    <!-- Десктопный фиксированный сайдбар (>= 1200px) — синхронизирован
         с режимом из EntitySearch -->
    <HomeSidebar :mode="searchMode" />

    <div class="home-body">
      <!-- Mobile: онлайн + текущая чётность недели в одной строке -->
      <div class="mobile-online">
        <OnlineCard compact />
        <span
          class="parity-chip"
          :class="`parity-${currentWeekParity}`"
          :title="`Сейчас идёт ${parityLabel.toLowerCase()} неделя`"
        >
          <span class="parity-dot" />
          <span class="parity-text">{{ parityLabel }}</span>
        </span>
      </div>

      <h1 class="home-title">
        Электронное расписание <br> 
        <span class="grad">Моя Академия - ИМСИТ</span>
      </h1>
      <p class="home-sub">Введите группу или фамилию преподавателя</p>

      <!-- v-model:mode синхронизирует выбранную плашку (группа/преподаватель)
           с TopList и HomeSidebar.
           @update:focused — пробрасывает фокус-стейт, чтобы заблюрить
           top + online при открытии dropdown'а. -->
      <EntitySearch
        v-model:mode="searchMode"
        @update:focused="(v: boolean) => (searchFocused = v)"
      />

      <div v-if="recent.length" class="recent">
        <div class="rc-lbl">Недавно просматривали</div>
        <div class="rc-list">
          <button
            v-for="r in recent"
            :key="r.type + r.id"
            class="rc-chip"
            type="button"
            @click="openRecent(r)"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {{ r.type === 'group' ? 'Группа' : 'Преподаватель' }} · {{ r.id }}
          </button>
        </div>
      </div>

      <!-- Mobile: топ под недавними — синхронно с плашкой выше -->
      <div class="mobile-top">
        <TopList :mode="searchMode" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.home {
  margin: 0 -20px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  /* Асимметричный padding: маленький сверху + значительный снизу.
     Flex-центровка происходит внутри content-box — большое
     padding-bottom «подталкивает» контент вверх, оставляя
     адаптивный запас снизу для открытого дропдауна (как у Google). */
  padding: 24px 20px clamp(140px, 24vh, 240px);
  background:
    radial-gradient(ellipse 70% 50% at 50% -5%, rgba(26, 79, 219, 0.12), transparent 55%),
    radial-gradient(ellipse 50% 35% at 90% 70%, rgba(14, 165, 233, 0.08), transparent 50%),
    var(--ds-bg);
}

/* ─── Mobile home: redistributed для лёгкого, дышащего ощущения ───
   Стратегия: уплотняем hero, освобождаем вертикальное пространство,
   переводим recent + top в horizontal scroll (паттерн iOS App Store). */
@media (max-width: 1200px) {
  .home {
    /* На mobile вертикальная центровка отключена — контент течёт сверху
       вниз с органичными отступами. Уменьшаем верхний padding, чтобы
       online-pill начинался ближе к header'у. */
    justify-content: flex-start;
    padding: 14px 16px 28px;
  }

  .home-body {
    gap: 0;
    /* Минусовые отступы по горизонтали позволяют каруселям
       (recent / top) выходить edge-to-edge до самого края экрана. */
    max-width: 100%;
  }

  /* ─── Online pill + parity chip (компактнее, ближе к заголовку) ─── */
  .mobile-online {
    margin-bottom: 10px;
  }

  /* ─── Hero: ещё плотнее, чтобы освободить вертикальное пространство
     для top-карусели прямо под search-баром. */
  .home-title {
    font-size: 1.4rem;
    line-height: 1.15;
    margin-bottom: 6px;
    letter-spacing: -0.025em;
  }

  /* На mobile убираем принудительный line-break после "расписание" —
     браузер сам перенесёт слова там, где нужно. */
  .home-title :deep(br),
  .home-title br {
    display: none;
  }

  .home-sub {
    font-size: 13px;
    max-width: 300px;
    margin-bottom: 14px;
    line-height: 1.45;
  }

  /* ─── Recent: горизонтальный скролл с edge-to-edge ─── */
  .recent {
    margin-top: 12px;
    width: 100%;
    text-align: left;
  }

  .rc-lbl {
    padding: 0 4px;
    margin-bottom: 10px;
  }

  .rc-list {
    flex-wrap: nowrap;
    justify-content: flex-start;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
    /* Edge-to-edge: компенсируем .home padding 16px */
    padding: 4px 16px 8px;
    margin: 0 -16px;
    /* iOS momentum scroll */
    -webkit-overflow-scrolling: touch;
  }

  .rc-list::-webkit-scrollbar {
    display: none;
  }

  .rc-chip {
    height: 32px;
    padding: 0 14px;
    font-size: 12px;
    flex-shrink: 0;
    scroll-snap-align: start;
    box-shadow: var(--shadow-xs);
  }

  /* ─── Top groups: вплотную к recent/поиску, edge-to-edge ─── */
  .mobile-top {
    /* 10px — топ карусель прижата к блоку Recent сразу под поиском.
       Так центр карусели визуально читается на одном уровне с центром
       поисковой строки в большинстве viewport'ов. */
    margin: 10px -16px 0;
    max-width: none;
    width: auto;
  }
}

/* ─── Узкий mobile (< 380px): ещё чуть тише ─── */
@media (max-width: 380px) {
  .home {
    padding: 12px 14px 24px;
  }

  .home-title {
    font-size: 1.32rem;
  }

  .home-sub {
    font-size: 13px;
    margin-bottom: 16px;
  }

  .rc-list,
  .mobile-top {
    margin-left: -14px;
    margin-right: -14px;
  }

  .rc-list {
    padding-left: 14px;
    padding-right: 14px;
  }
}

.home-grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--ds-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--ds-border) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%);
  opacity: 0.5;
  pointer-events: none;
  z-index: 0;
}

/* ─── Декоративные фоновые элементы (blob'ы + плавающие иконки) ─── */
.home-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

/* Большие мягкие «облака» бренда — заполняют пустое пространство */
.decor-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.45;
  animation: blob-float 18s ease-in-out infinite;
}

.decor-blob-1 {
  width: 280px;
  height: 280px;
  top: -60px;
  right: -80px;
  background: radial-gradient(
    circle,
    rgba(26, 79, 219, 0.18),
    transparent 70%
  );
  animation-delay: 0s;
}

.decor-blob-2 {
  width: 240px;
  height: 240px;
  bottom: 80px;
  left: -100px;
  background: radial-gradient(
    circle,
    rgba(14, 165, 233, 0.15),
    transparent 70%
  );
  animation-delay: -6s;
  animation-duration: 22s;
}

.decor-blob-3 {
  width: 180px;
  height: 180px;
  top: 38%;
  right: 12%;
  background: radial-gradient(
    circle,
    rgba(139, 92, 246, 0.1),
    transparent 70%
  );
  animation-delay: -12s;
  animation-duration: 26s;
}

@keyframes blob-float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(20px, -15px) scale(1.05);
  }
  66% {
    transform: translate(-15px, 10px) scale(0.95);
  }
}

/* ─── Icon rain — schedule-related иконки падают сверху вниз как дождь ───
   Каждая .rain-drop получает рандомизированные --rain-* CSS-переменные
   из inline-style (см. setup), общая анимация в CSS. */
.icon-rain {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.rain-drop {
  position: absolute;
  top: -10vh;
  color: var(--ds-fg-faint);
  fill: none;
  stroke: currentColor;
  animation: rain-fall var(--rain-duration, 18s) linear infinite;
  animation-delay: var(--rain-delay, 0s);
  /* Базовый transform — стартовый поворот, дальше анимация добавляет
     translateY/translateX/rotate. */
  will-change: transform;
}

.rain-drop svg {
  width: 100%;
  height: 100%;
  display: block;
}

[data-theme='dark'] .rain-drop {
  color: var(--ds-fg-faint);
}

@keyframes rain-fall {
  0% {
    transform: translate3d(0, 0, 0)
      rotate(var(--rain-rot, 0deg));
  }
  100% {
    transform: translate3d(var(--rain-drift, 0), 115vh, 0)
      rotate(calc(var(--rain-rot, 0deg) + 60deg));
  }
}

/* Reduced-motion: останавливаем дождь, оставляем blobs замёрзшими */
@media (prefers-reduced-motion: reduce) {
  .decor-blob,
  .rain-drop {
    animation: none;
  }
  .rain-drop {
    /* Закрепляем иконки в их стартовых позициях, чтобы не висели вверху */
    top: auto;
    bottom: 50%;
    opacity: 0.04 !important;
  }
}

/* На совсем узких экранах сокращаем плотность — каждая третья
   иконка скрыта (через nth-child) */
@media (max-width: 380px) {
  .rain-drop:nth-child(3n) {
    display: none;
  }
}

/* ─── Search focus: заблюривание плавающих блоков ───
   Когда поиск открыт, фоновые online + parity + top «уходят» назад
   (blur + fade), но НЕ двигаются — позиция фиксирована, чтобы взгляд
   не дёргался при открытии dropdown'а. */
.home.is-search-active .mobile-online,
.home.is-search-active .mobile-top,
.home.is-search-active :deep(.fixed-online),
.home.is-search-active :deep(.fixed-top) {
  filter: blur(4px);
  opacity: 0.5;
  pointer-events: none;
  transition: filter 0.28s var(--ease-out, ease),
    opacity 0.24s ease;
}

/* Возврат — чуть быстрее, чтобы UI «оживал» резко */
.home .mobile-online,
.home .mobile-top,
.home :deep(.fixed-online),
.home :deep(.fixed-top) {
  transition: filter 0.2s ease, opacity 0.18s ease;
}

/* Reduced-motion: blur тяжёлый — оставляем только fade */
@media (prefers-reduced-motion: reduce) {
  .home.is-search-active .mobile-online,
  .home.is-search-active .mobile-top,
  .home.is-search-active :deep(.fixed-online),
  .home.is-search-active :deep(.fixed-top) {
    filter: none;
    opacity: 0.4;
  }
}

/* ─── Чип чётности недели (рядом с online-pill) ─── */
.parity-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--r-full);
  background: var(--ds-surface);
  border: 1px solid var(--ds-border-strong);
  box-shadow: var(--shadow-sm);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ds-fg-muted);
  white-space: nowrap;
  cursor: default;
  user-select: none;
}

.parity-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ds-accent);
  flex-shrink: 0;
}

.parity-1 {
  background: var(--ds-accent-soft);
  border-color: var(--ds-accent-border);
  color: var(--ds-accent);
}

.parity-1 .parity-dot {
  background: var(--ds-accent);
}

.parity-2 {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  color: var(--violet);
}

.parity-2 .parity-dot {
  background: var(--violet);
}

[data-theme='dark'] .parity-2 {
  background: rgba(167, 139, 250, 0.14);
  border-color: rgba(167, 139, 250, 0.32);
  color: #A78BFA;
}

[data-theme='dark'] .parity-2 .parity-dot {
  background: #A78BFA;
}

.home-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 720px;
}

.home-title {
  font-family: var(--ds-font-display);
  font-size: clamp(1.55rem, 3.8vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--ds-fg);
  text-align: center;
  margin-bottom: 10px;
}

.grad {
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.home-sub {
  font-size: 14.5px;
  color: var(--ds-fg-soft);
  text-align: center;
  max-width: 420px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.recent {
  margin-top: 18px;
  text-align: center;
}

.rc-lbl {
  font-size: 10.5px;
  color: var(--ds-fg-faint);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 8px;
}

.rc-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.rc-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 11px;
  border-radius: var(--r-full);
  font-size: 11px;
  font-weight: 500;
  color: var(--ds-fg-soft);
  border: 1px solid var(--ds-border-strong);
  background: var(--ds-surface);
  transition: all 0.15s;
  cursor: pointer;
}

.rc-chip:hover {
  border-color: var(--ds-accent-border);
  color: var(--ds-accent);
  background: var(--ds-accent-soft);
}

/* ─── Мобильные блоки: онлайн (над заголовком) + топ-группы (под недавними) ─── */
.mobile-online {
  display: none;
  margin-bottom: 16px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mobile-top {
  display: none;
  width: 100%;
  /* Шире и привлекательнее: используем больше горизонтального пространства */
  max-width: 480px;
  margin-top: 24px;
}

/* По умолчанию (десктоп) — показывает HomeSidebar (фиксированный слева).
   На < 1200px HomeSidebar скрывается, и появляются inline-блоки. */
@media (max-width: 1200px) {
  .mobile-online {
    display: flex;
    justify-content: center;
  }
  .mobile-top {
    display: block;
  }
}

@media (min-width: 768px) {
  .home {
    margin: 0 -100px;
  }
}
</style>

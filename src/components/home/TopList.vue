<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getTop, type TopEntry } from '../../api/presence'

type Mode = 'group' | 'teacher'

const props = withDefaults(
  defineProps<{
    mode?: Mode
    /** Заголовок, переопределяет дефолтный */
    title?: string
  }>(),
  { mode: 'group', title: '' },
)

const router = useRouter()

/* ─── Top из бэкенда ───
 * GET /api/v1/configuration/online/top/{groups|teachers} → массив TopEntry.
 * Кэшируем результат по mode, чтобы не дёргать API при каждом
 * переключении group ↔ teacher.
 *
 * Loading (нет данных) → показываем шиммер-карточки.
 * Error / пусто → пустое состояние без сбоев. */
const topData = ref<{ group: TopEntry[] | null; teacher: TopEntry[] | null }>({
  group: null,
  teacher: null,
})
const loading = ref<{ group: boolean; teacher: boolean }>({
  group: false,
  teacher: false,
})

async function loadTop(mode: Mode) {
  if (loading.value[mode]) return
  loading.value[mode] = true
  try {
    const apiMode = mode === 'teacher' ? 'teachers' : 'groups'
    const data = await getTop(apiMode)
    topData.value[mode] = data
  } catch (e) {
    console.warn('[TopList] failed to load top', mode, e)
    // Не оставляем null навсегда — пустой массив = empty state
    topData.value[mode] = []
  } finally {
    loading.value[mode] = false
  }
}

// Загружаем при первом монтировании и при смене mode
watch(
  () => props.mode,
  (m) => {
    if (topData.value[m] === null) loadTop(m)
  },
  { immediate: true },
)

const items = computed<TopEntry[]>(() => {
  const data = topData.value[props.mode]
  return data ?? []
})

const isLoading = computed(() => topData.value[props.mode] === null)

const computedTitle = computed(() => {
  if (props.title) return props.title
  return props.mode === 'teacher' ? 'Топ преподавателей' : 'Топ групп'
})

function formatViews(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function open(id: string) {
  if (props.mode === 'teacher') {
    router.push({ name: 'teacher-schedule', params: { teacherId: id } })
  } else {
    router.push({ name: 'group-schedule', params: { groupId: id } })
  }
}

/* Скелет-карточки для loading state — ровно столько, сколько обычно
 * приходит в топе (5). Используются для shimmer-плейсхолдера. */
const SKELETON_COUNT = 5
const skeletons = Array.from({ length: SKELETON_COUNT }, (_, i) => i)
</script>

<template>
  <div class="top-card">
    <div class="top-card-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
      <Transition name="title-swap" mode="out-in">
        <span :key="computedTitle">{{ computedTitle }}</span>
      </Transition>
    </div>

    <!-- Transition с mode="out-in" даёт стабильную смену списка:
         старый набор фейдится наружу, потом приходит новый. В отличие от
         TransitionGroup, leaving-элементы не получают position: absolute и
         не стакаются на левом краю карусели — фон карточек больше не
         «прыгает» при переключении group ↔ teacher. -->
    <Transition name="top-swap" mode="out-in">
      <!-- Loading: shimmer-карточки -->
      <div v-if="isLoading" key="loading" class="top-list top-list-skeleton">
        <div
          v-for="n in skeletons"
          :key="`sk-${n}`"
          class="top-item top-item-skeleton"
          aria-hidden="true"
        >
          <div class="top-rank top-rank-skeleton" />
          <div class="top-info">
            <div class="top-name-skeleton" />
            <div class="top-views-skeleton" />
          </div>
        </div>
      </div>

      <!-- Loaded but empty -->
      <div v-else-if="!items.length" key="empty" class="top-empty">
        Пока нет данных
      </div>

      <!-- Loaded list -->
      <div v-else :key="props.mode" class="top-list">
        <button
          v-for="(it, i) in items"
          :key="it.key"
          class="top-item"
          type="button"
          @click="open(it.key)"
        >
          <!-- Декоративный фон-кубок в правом верхнем углу. aria-hidden,
               чтобы не озвучивался скринридером. Цвет наследуется от
               .top-rank через CSS color-cascade (медальные оттенки top-3,
               нейтральный для остальных). -->
          <svg
            class="top-trophy"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
            <path d="M17 5h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3" />
            <path d="M7 5H5a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3" />
          </svg>

          <div class="top-rank" :data-rank="i + 1">{{ i + 1 }}</div>
          <div class="top-info">
            <div class="top-name">{{ it.key }}</div>
            <div class="top-views">{{ formatViews(it.value) }} просм.</div>
          </div>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.top-card {
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--r-lg);
  padding: 14px 12px;
  box-shadow: var(--shadow-sm);
}

/* ─── Анимации перехода между режимами (group ↔ teacher) ─── */

/* Заголовок "Топ групп" / "Топ преподавателей" — мягкий cross-fade */
.title-swap-enter-active,
.title-swap-leave-active {
  transition: opacity 0.18s ease, transform 0.22s var(--ease-out, ease);
}

.title-swap-enter-from {
  opacity: 0;
  transform: translateY(-3px);
}

.title-swap-leave-to {
  opacity: 0;
  transform: translateY(3px);
}

/* Список items — fade + лёгкий slide. mode="out-in" гарантирует
   последовательность: leave-active полностью завершается, потом
   enter-active. Поэтому position: absolute не нужен — элементы
   не накладываются друг на друга. */
.top-swap-enter-active {
  transition: opacity 0.2s ease, transform 0.24s var(--ease-out, ease);
}

.top-swap-leave-active {
  /* Exit чуть быстрее (~70% от enter) — feels responsive */
  transition: opacity 0.14s ease, transform 0.18s var(--ease-out, ease);
}

.top-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.top-swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Reduced-motion friendly: только opacity, без transform */
@media (prefers-reduced-motion: reduce) {
  .title-swap-enter-active,
  .title-swap-leave-active,
  .top-swap-enter-active,
  .top-swap-leave-active {
    transition: opacity 0.15s ease;
  }

  .title-swap-enter-from,
  .title-swap-leave-to,
  .top-swap-enter-from,
  .top-swap-leave-to {
    transform: none;
  }
}

/* ─── Shimmer skeleton (loading state) ───
   Прозрачные блоки в форме топ-карточки с двигающимся градиентом —
   привычный паттерн для async list (Apple HIG progressive-loading). */
.top-item-skeleton {
  pointer-events: none;
  border: 1px solid var(--ds-border);
  background: var(--ds-surface);
  box-shadow: var(--shadow-xs);
}

.top-rank-skeleton,
.top-name-skeleton,
.top-views-skeleton {
  background: linear-gradient(
    90deg,
    rgba(15, 23, 42, 0.06) 0%,
    rgba(15, 23, 42, 0.13) 50%,
    rgba(15, 23, 42, 0.06) 100%
  );
  background-size: 200% 100%;
  animation: top-shimmer 1.4s ease-in-out infinite;
  border-radius: 6px;
}

[data-theme='dark'] .top-rank-skeleton,
[data-theme='dark'] .top-name-skeleton,
[data-theme='dark'] .top-views-skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.12) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
}

.top-rank-skeleton {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.top-name-skeleton {
  width: 70%;
  height: 12px;
}

.top-views-skeleton {
  width: 45%;
  height: 9px;
  margin-top: 4px;
}

@keyframes top-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .top-rank-skeleton,
  .top-name-skeleton,
  .top-views-skeleton {
    animation: none;
    opacity: 0.5;
  }
}

/* ─── Empty state (нет данных в топе) ─── */
.top-empty {
  padding: 18px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--ds-fg-faint);
  border: 1px dashed var(--ds-border-strong);
  border-radius: var(--r-md);
  background: var(--ds-surface-soft);
}

.top-card-title {
  font-family: var(--ds-font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ds-fg-faint);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.top-card-title svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  flex-shrink: 0;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.top-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background 0.12s;
  width: 100%;
  border: 0;
  background: none;
  font-family: inherit;
  text-align: left;
  /* Якорь для абсолютной иконки-кубка */
  position: relative;
  overflow: hidden;
}

/* ─── Декоративный кубок (watermark в правом верхнем углу) ───
   На desktop в боковом сайдбаре скрываем — там карточки слишком
   тесные. Появляется только в mobile-карусели (см. media-query ниже). */
.top-trophy {
  display: none;
}

.top-item:hover {
  background: var(--ds-surface-soft);
}

.top-rank {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ds-surface-sunk);
  border: 1px solid var(--ds-border);
  font-size: 9.5px;
  font-weight: 700;
  color: var(--ds-fg-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Медальные цвета */
.top-item:nth-child(1) .top-rank {
  background: rgba(245, 158, 11, 0.15);
  color: var(--amber);
  border-color: rgba(245, 158, 11, 0.3);
}

.top-item:nth-child(2) .top-rank {
  background: rgba(100, 116, 139, 0.12);
  color: var(--ds-fg-soft);
  border-color: rgba(100, 116, 139, 0.25);
}

.top-item:nth-child(3) .top-rank {
  background: rgba(180, 83, 9, 0.1);
  color: #B45309;
  border-color: rgba(180, 83, 9, 0.2);
}

.top-info {
  min-width: 0;
}

.top-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--ds-fg);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-views {
  font-size: 10px;
  color: var(--ds-fg-faint);
  margin-top: 1px;
}

/* ─── Mobile: горизонтальная карусель карточек (паттерн iOS App Store)
   Освобождает вертикальное пространство и выглядит более premium. ─── */
@media (max-width: 1200px) {
  .top-card {
    /* Контейнер становится «прозрачным» — без фона/border, только заголовок
       + горизонтальный snap-скролл. Так top-card встраивается в страницу
       без визуального дублирования рамок. */
    background: transparent;
    border: 0;
    padding: 0;
    box-shadow: none;
    border-radius: 0;
  }

  .top-card-title {
    font-size: 11.5px;
    margin-bottom: 12px;
    letter-spacing: 0.1em;
    /* Возвращаем горизонтальный отступ для заголовка (карусель ниже
       будет edge-to-edge) */
    padding: 0 16px;
  }

  .top-card-title svg {
    width: 13px;
    height: 13px;
  }

  /* ─── Горизонтальная карусель ─── */
  .top-list {
    flex-direction: row;
    gap: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
    padding: 4px 16px 8px;
    /* min-height фиксирует высоту во время mode-transition (group ↔
       teacher), иначе при mode="out-in" карусель схлопывается на ~120мс
       пока enter-фаза не подгрузит новые карточки. 110px = высота
       карточки 96px + padding 4px+8px + запас 2px. */
    min-height: 110px;
    /* margin: 0 — родительский .mobile-top уже даёт отрицательный
       horizontal margin, чтобы карусель доходила до края экрана. */
  }

  .top-list::-webkit-scrollbar {
    display: none;
  }

  /* ─── Карточка топ-группы ─── */
  .top-item {
    flex-direction: column;
    align-items: flex-start;
    flex-shrink: 0;
    /* 168px — комфортно вмещает фамилии вида «Новикова Е.С.»
       или «Александровский» в 1-2 строки без обрыва. */
    width: 168px;
    padding: 14px 14px 12px;
    gap: 12px;
    background: var(--ds-surface);
    border: 1px solid var(--ds-border);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-sm);
    scroll-snap-align: start;
    transition: transform 0.18s var(--ease-out, ease), box-shadow 0.18s ease,
      border-color 0.18s ease;
  }

  /* Hover-эффект только для устройств с реальным курсором — на touch
     избегаем sticky-hover после tap. */
  @media (hover: hover) {
    .top-item:hover {
      background: var(--ds-surface);
      border-color: var(--ds-accent-border);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }
  }

  .top-item:active {
    transform: scale(0.98);
  }

  .top-rank {
    width: 28px;
    height: 28px;
    font-size: 12.5px;
    font-weight: 800;
  }

  .top-info {
    width: 100%;
  }

  .top-name {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.25;
    /* На карточке имя может занимать 2 строки — снимаем truncation */
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .top-views {
    font-size: 11px;
    margin-top: 4px;
    color: var(--ds-fg-faint);
  }

  /* Чтобы первая карточка совпадала с заголовком по левому краю — добавим
     subtle "edge-fade" справа для подсказки на горизонтальный скролл */
  .top-list {
    mask-image: linear-gradient(
      to right,
      black 0,
      black calc(100% - 32px),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to right,
      black 0,
      black calc(100% - 32px),
      transparent 100%
    );
  }

  /* ─── Trophy watermark в правом верхнем углу карточки ───
     Большой, полупрозрачный, обрезается границами карточки. Цвет
     наследуется из .top-rank каждого ранга — так top-3 получают
     медальные оттенки, остальные — нейтральный slate. */
  .top-trophy {
    display: block;
    position: absolute;
    /* Сдвигаем чуть за край, чтобы иконка казалась «выходящей» из карточки */
    top: -10px;
    right: -10px;
    width: 56px;
    height: 56px;
    color: var(--ds-fg-faint);
    opacity: 0.12;
    pointer-events: none;
    transition: opacity 0.18s ease, transform 0.22s var(--ease-out, ease);
  }

  /* Для top-3 — цвет от ранга (через :nth-child наследуем accent) */
  .top-item:nth-child(1) .top-trophy {
    color: var(--amber);
    opacity: 0.22;
  }

  .top-item:nth-child(2) .top-trophy {
    color: var(--ds-fg-soft);
    opacity: 0.18;
  }

  .top-item:nth-child(3) .top-trophy {
    color: #B45309;
    opacity: 0.18;
  }

  /* Hover усиливает кубок — небольшой лифт + чуть больше непрозрачность */
  @media (hover: hover) {
    .top-item:hover .top-trophy {
      opacity: 0.32;
      transform: translate(-2px, 2px) rotate(-6deg);
    }

    .top-item:nth-child(1):hover .top-trophy {
      opacity: 0.42;
    }
  }

  /* Skeleton-карточки на mobile — наследуют размер top-item, но
     внутренние плейсхолдеры под mobile font-sizes */
  .top-rank-skeleton {
    width: 28px;
    height: 28px;
  }

  .top-name-skeleton {
    height: 14px;
  }

  .top-views-skeleton {
    height: 11px;
    margin-top: 5px;
  }

  /* Empty state на mobile — выравниваем по центру карусели */
  .top-empty {
    margin: 0 16px;
  }

  /* Dark mode: увеличиваем opacity, чтобы watermark оставался читаемым
     на тёмной поверхности. [data-theme="dark"] стоит на <html>, поэтому
     ancestor-селектор работает напрямую в scoped-стилях. */
  [data-theme='dark'] .top-trophy {
    opacity: 0.18;
  }

  [data-theme='dark'] .top-item:nth-child(1) .top-trophy {
    opacity: 0.32;
  }

  [data-theme='dark'] .top-item:nth-child(2) .top-trophy {
    opacity: 0.26;
  }

  [data-theme='dark'] .top-item:nth-child(3) .top-trophy {
    opacity: 0.26;
  }
}

/* Узкий mobile — карточки чуть уже, но всё ещё с запасом под длинные ФИО */
@media (max-width: 380px) {
  .top-item {
    width: 152px;
    padding: 12px 12px 11px;
  }
}

/* Также добавим минимальную высоту, чтобы карточки в карусели не «прыгали»
   по высоте при переключении group ↔ teacher (короткие vs длинные имена). */
@media (max-width: 1200px) {
  .top-item {
    min-height: 96px;
    justify-content: space-between;
  }

  .top-name {
    /* Деликатный word-break для очень длинных слов (составные фамилии),
       чтобы избежать горизонтального overflow внутри карточки. */
    word-break: normal;
    overflow-wrap: anywhere;
    /* Ограничиваем 2 строками с эллипсисом — на всякий случай для
       совсем экстремальных кейсов */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
</style>

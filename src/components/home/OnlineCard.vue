<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { sendHeartbeat, subscribeOnline } from '../../api/presence'
import { getClientUuid } from '../../utils/clientId'

/** Маленький компонент-индикатор онлайн-пользователей.
 *  Используется и в фиксированном HomeSidebar, и в мобильной разметке HomePage.
 *
 *  Поток данных:
 *    — Каждые 30 секунд POST /online/heartbeat/:uuid сообщает backend'у, что
 *      этот клиент жив. Запас по сравнению с минутным окном backend'а
 *      гарантирует, что мы не «отвалимся» при сетевых лагах или throttling
 *      браузера в фоновых вкладках.
 *    — SSE GET /online/sse раз в минуту присылает обновлённое число онлайн.
 *    — Heartbeat отправляется сразу при mount + каждые 30s. */

withDefaults(
  defineProps<{
    /** Компактный режим — для мобильной шапки над поисковой строкой */
    compact?: boolean
  }>(),
  { compact: false },
)

/* Стартовое значение = 1: сам клиент сейчас рендерит компонент, значит
 * минимум один онлайн-пользователь точно есть. Это убирает мерцание
 * shimmer'ом до прихода первого SSE-эвента. */
const onlineCount = ref<number>(1)

let heartbeatTicker: ReturnType<typeof setInterval> | null = null
let unsubscribeOnline: (() => void) | null = null

const HEARTBEAT_INTERVAL_MS = 30_000

function postHeartbeatSafe(uuid: string) {
  sendHeartbeat(uuid).catch((err) => {
    // Не падаем — heartbeat не блокирующая операция
    console.warn('[OnlineCard] heartbeat failed', err)
  })
}

onMounted(() => {
  const uuid = getClientUuid()

  // Первый heartbeat сразу — чтобы попасть в текущее окно подсчёта
  postHeartbeatSafe(uuid)
  heartbeatTicker = setInterval(() => postHeartbeatSafe(uuid), HEARTBEAT_INTERVAL_MS)

  // Подписка на SSE-поток с count'ом. Минимум 1 — текущий клиент всегда
  // онлайн в момент рендера, поэтому 0 от backend'а считаем гонкой и
  // показываем хотя бы единичку.
  // onError специально не передаём: внутри subscribeOnline есть авто-
  // реконнект через 5s, и не нужно спамить console каждые 5s при
  // временной недоступности SSE-эндпоинта.
  unsubscribeOnline = subscribeOnline((count) => {
    onlineCount.value = Math.max(1, count)
  })
})

onUnmounted(() => {
  if (heartbeatTicker) clearInterval(heartbeatTicker)
  if (unsubscribeOnline) unsubscribeOnline()
})
</script>

<template>
  <div class="online-card" :class="{ 'online-compact': compact }">
    <div class="online-row">
      <div class="online-label">
        <span class="online-dot" />
        <span>Онлайн</span>
      </div>
      <div class="online-val">{{ onlineCount }}</div>
    </div>
    <div v-if="!compact" class="online-sub">сейчас смотрят расписание</div>
    <div v-else class="online-sub-inline">смотрят расписание</div>
  </div>
</template>

<style scoped>
.online-card {
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--r-lg);
  padding: 10px 12px;
  box-shadow: var(--shadow-sm);
}

.online-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.online-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-fg-soft);
}

.online-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);
  animation: pulse 2s infinite;
  flex-shrink: 0;
}

.online-val {
  font-family: var(--ds-font-display);
  font-size: 18px;
  font-weight: 800;
  color: var(--green);
  letter-spacing: -0.02em;
}

.online-sub {
  font-size: 9.5px;
  color: var(--ds-fg-faint);
  margin-top: 3px;
}

/* ─── Компактный режим: pill-плашка с inline-текстом ─── */
.online-compact {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--r-full);
  background: var(--ds-surface);
  border: 1px solid var(--ds-border-strong);
  box-shadow: var(--shadow-sm);
  white-space: nowrap;
}

.online-compact .online-row {
  gap: 5px;
}

.online-compact .online-val {
  font-size: 13px;
  font-weight: 800;
}

.online-compact .online-label {
  font-size: 11.5px;
}

.online-sub-inline {
  font-size: 10.5px;
  color: var(--ds-fg-faint);
}

@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
  70%  { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
</style>

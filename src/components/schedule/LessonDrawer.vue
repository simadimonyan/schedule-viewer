<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Lesson, Group, Teacher } from '../../types/schedule'
import type { CombinedLesson } from '../../utils/lessons'

const router = useRouter()

const props = defineProps<{
  lesson: Lesson | CombinedLesson | null
  dayDate: string
  mode?: 'group' | 'teacher'
}>()

/* Все группы этого слота. Если lesson — это CombinedLesson с массивом
 * groups (например, лекция препода для нескольких групп), показываем все.
 * Иначе fallback на одиночную lesson.group. */
const allGroups = computed<Group[]>(() => {
  if (!props.lesson) return []
  if ('groups' in props.lesson && Array.isArray(props.lesson.groups) && props.lesson.groups.length) {
    return props.lesson.groups
  }
  return props.lesson.group ? [props.lesson.group] : []
})

/* Подгруппы (deduplicated по name) — нужны когда одна и та же
 * group отображается несколько раз в combined (на всякий случай). */
const uniqueGroups = computed<Group[]>(() => {
  const seen = new Set<string>()
  return allGroups.value.filter((g) => {
    const key = g.id?.toString() ?? g.name
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const hasMultipleGroups = computed(() => uniqueGroups.value.length > 1)

/* Переходы по клику. После router.push закрываем drawer, чтобы пользователь
 * сразу видел новое расписание без overlay'я. */
function openTeacher(t: Teacher) {
  if (!t?.label) return
  emit('close')
  router.push({ name: 'teacher-schedule', params: { teacherId: t.label } })
}

function openGroup(g: Group) {
  if (!g?.name) return
  emit('close')
  router.push({ name: 'group-schedule', params: { groupId: g.name } })
}

const emit = defineEmits<{ (e: 'close'): void }>()

/* Возвращает CSS-переменную для цвета типа занятия — синхронизирована
 * с --lesson-* токенами в style.css. Получая var(...), badge правильно
 * адаптируется к светлой/тёмной теме без дублирования логики. */
function typeColor(type: string | undefined): string {
  if (!type) return 'var(--lesson-lecture)'
  const t = type.toLowerCase()
  if (t.includes('практик')) return 'var(--lesson-practice)'
  if (t.includes('лабор')) return 'var(--lesson-lab)'
  if (t.includes('экзамен') || t.includes('зачёт') || t.includes('зачет'))
    return 'var(--lesson-exam)'
  if (t.includes('вводн') || t.includes('установ') || t.includes('ознаком'))
    return 'var(--lesson-intro)'
  return 'var(--lesson-lecture)'
}

const badgeColor = computed(() => typeColor(props.lesson?.lessonType))

const timeText = computed(() => {
  if (!props.lesson) return ''
  const [s, e] = props.lesson.timePeriod.split('-').map(x => x?.trim().replace('.', ':'))
  return `${s} — ${e}`
})

const durationText = computed(() => {
  if (!props.lesson) return ''
  const toM = (hhmm: string) => {
    const [h, m] = (hhmm || '').split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  const [s, e] = props.lesson.timePeriod.split('-').map(x => x?.trim().replace('.', ':'))
  const dur = toM(e || '') - toM(s || '')
  return dur > 0 ? `Продолжительность ${dur} мин` : ''
})

function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drw">
      <div v-if="lesson" class="drw-ov">
        <div class="drw-bd" @click="emit('close')" />
        <div class="drw">
          <!-- Header -->
          <div class="drw-hdr">
            <div class="drw-badge" :style="{ background: badgeColor }">
              {{ lesson.lessonType || 'Занятие' }}
            </div>
            <button class="drw-x" type="button" @click="emit('close')">
              <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="drw-body">
            <div class="drw-subj">{{ lesson.lessonName }}</div>

            <!-- Time & room -->
            <div class="drw-sec">
              <div class="drw-sec-lbl">Расписание</div>
              <div class="drw-row">
                <div class="dri">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <div class="drt">{{ timeText }}</div>
                  <div class="drs">{{ durationText }}</div>
                </div>
              </div>
              <div v-if="lesson.auditory" class="drw-row">
                <div class="dri">
                  <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div>
                  <div class="drt">Аудитория {{ lesson.auditory }}</div>
                  <div class="drs">Учебная аудитория</div>
                </div>
              </div>
            </div>

            <!-- People & date -->
            <div class="drw-sec">
              <div class="drw-sec-lbl">Участники</div>
              <button
                v-if="lesson.teacher && mode !== 'teacher'"
                type="button"
                class="drw-row drw-row-link"
                @click="openTeacher(lesson.teacher)"
              >
                <div class="dri">
                  <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="drw-row-body">
                  <div class="drt">{{ lesson.teacher.label }}</div>
                  <div class="drs">{{ lesson.teacher.department }}</div>
                </div>
                <svg class="drw-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
              <!-- Одна группа — кликабельная строка с переходом
                   на расписание этой группы -->
              <button
                v-if="!hasMultipleGroups && uniqueGroups[0] && mode !== 'group'"
                type="button"
                class="drw-row drw-row-link"
                @click="openGroup(uniqueGroups[0])"
              >
                <div class="dri">
                  <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div class="drw-row-body">
                  <div class="drt">{{ uniqueGroups[0].name }}</div>
                  <div class="drs">{{ uniqueGroups[0].level }}</div>
                </div>
                <svg class="drw-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              <!-- Несколько групп (дубликаты слиты в CombinedLesson) —
                   каждая группа в списке кликабельна и ведёт на её
                   расписание. -->
              <div
                v-else-if="hasMultipleGroups && mode !== 'group'"
                class="drw-row drw-row-multi"
              >
                <div class="dri">
                  <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div class="drw-multi-body">
                  <div class="drt">
                    Группы потока
                    <span class="drw-count-badge">{{ uniqueGroups.length }}</span>
                  </div>
                  <ul class="drw-grouplist">
                    <li
                      v-for="g in uniqueGroups"
                      :key="g.id ?? g.name"
                    >
                      <button
                        type="button"
                        class="drw-grouplist-item"
                        @click="openGroup(g)"
                      >
                        <span class="drw-grouplist-name">{{ g.name }}</span>
                        <span v-if="g.level" class="drw-grouplist-meta">{{ g.level }}</span>
                        <svg class="drw-grouplist-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
              <div class="drw-row">
                <div class="dri">
                  <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                </div>
                <div>
                  <div class="drt">{{ lesson.dayWeek }}</div>
                  <div class="drs">{{ formatDate(dayDate) }}</div>
                </div>
              </div>
            </div>

            <!-- CTA: ссылка на ЭИОС показывается только если у занятия она есть -->
            <div class="drw-cta">
              <a
                v-if="lesson.eiosLink"
                :href="lesson.eiosLink"
                target="_blank"
                rel="noopener"
                class="btn-p"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Открыть в ЭИОС
              </a>
              <button class="btn-o" type="button" @click="emit('close')">Закрыть</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drw-ov {
  position: fixed;
  inset: 0;
  z-index: 500;
}

.drw-bd {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, .35);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  /* Анимируем сам filter (а не только opacity родителя), иначе блюр
     "проявляется" с задержкой относительно затемнения и слайда дровера. */
  transition: opacity .25s ease, backdrop-filter .25s ease, -webkit-backdrop-filter .25s ease;
}

.drw {
  position: absolute;
  right: 0; top: 0; bottom: 0;
  width: 360px;
  max-width: 94vw;
  background: var(--ds-surface);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Header ─── */
.drw-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--ds-border);
  flex-shrink: 0;
}

.drw-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--r-full);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}

.drw-x {
  width: 30px; height: 30px;
  border-radius: var(--r-sm);
  display: flex; align-items: center; justify-content: center;
  background: var(--ds-surface-soft);
  color: var(--ds-fg-soft);
  transition: all .12s;
  border: none; cursor: pointer;
}
.drw-x:hover { background: var(--ds-accent-soft); color: var(--ds-accent); }
.drw-x svg {
  width: 13px; height: 13px;
  fill: none; stroke: currentColor;
  stroke-width: 2.5; stroke-linecap: round;
}

/* ─── Body ─── */
.drw-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.drw-subj {
  font-family: var(--ds-font-display);
  font-size: 19px;
  font-weight: 800;
  color: var(--ds-fg);
  margin-bottom: 20px;
  letter-spacing: -.02em;
  line-height: 1.25;
}

.drw-sec { margin-bottom: 14px; }

.drw-sec-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--ds-fg-faint);
  margin-bottom: 7px;
}

.drw-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--r-md);
  background: var(--ds-surface-soft);
  margin-bottom: 4px;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease,
    transform 0.12s ease;
}
.drw-row:last-child { margin-bottom: 0; }

/* ─── Кликабельная строка (teacher / group) ───
 * Кнопочный вариант drw-row: hover-стейт + chevron, открывает
 * расписание соответствующей сущности. */
button.drw-row-link {
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  align-items: center;
}

.drw-row-link:hover {
  background: var(--ds-accent-soft);
  border-color: var(--ds-accent-border);
}

.drw-row-link:active {
  transform: scale(0.985);
}

.drw-row-body {
  flex: 1;
  min-width: 0;
}

.drw-row-chevron {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--ds-fg-faint);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.18s ease, transform 0.18s ease, color 0.15s ease;
  align-self: center;
}

.drw-row-link:hover .drw-row-chevron {
  opacity: 1;
  transform: translateX(0);
  color: var(--ds-accent);
}

.dri {
  width: 28px; height: 28px;
  border-radius: var(--r-sm);
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: var(--ds-fg-faint);
  box-shadow: var(--shadow-xs);
}
.dri svg {
  width: 13px; height: 13px;
  fill: none; stroke: currentColor;
  stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
}

.drt { font-size: 13px; font-weight: 500; color: var(--ds-fg); }
.drs { font-size: 11px; color: var(--ds-fg-soft); margin-top: 2px; }

/* ─── Multi-group row (дубликаты пар) ─── */
.drw-row-multi {
  align-items: flex-start;
}

.drw-multi-body {
  flex: 1;
  min-width: 0;
}

.drw-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  margin-left: 6px;
  border-radius: var(--r-full);
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0;
  vertical-align: 1px;
}

.drw-grouplist {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* button-вариант: clickable group row, переход на её расписание */
.drw-grouplist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border-radius: var(--r-sm);
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease,
    transform 0.1s ease;
}

.drw-grouplist-item:hover {
  background: var(--ds-accent-soft);
  border-color: var(--ds-accent-border);
}

.drw-grouplist-item:active {
  transform: scale(0.985);
}

.drw-grouplist-name {
  font-weight: 600;
  color: var(--ds-fg);
  flex: 1;
  min-width: 0;
}

.drw-grouplist-meta {
  font-size: 10.5px;
  color: var(--ds-fg-faint);
  white-space: nowrap;
  flex-shrink: 0;
}

.drw-grouplist-chevron {
  width: 12px;
  height: 12px;
  color: var(--ds-fg-faint);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.18s ease, transform 0.18s ease, color 0.15s ease;
  flex-shrink: 0;
}

.drw-grouplist-item:hover .drw-grouplist-chevron {
  opacity: 1;
  transform: translateX(0);
  color: var(--ds-accent);
}

/* ─── CTA ─── */
.drw-cta {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 18px;
}

.btn-p {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 42px;
  border-radius: var(--r-full);
  background: var(--ds-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.btn-p:hover {
  background: var(--brand-primary-h);
  transform: translateY(-1px);
}

.btn-p svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.btn-o {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  border-radius: var(--r-full);
  border: 1px solid var(--ds-border-strong);
  background: transparent;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ds-fg-soft);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-o:hover {
  border-color: var(--ds-accent-border);
  color: var(--ds-accent);
  background: var(--ds-accent-soft);
}

/* ─── Transition ─── (единый transition-язык: backdrop fade + slide-in-from-right)
 * Enter ~280ms spring, leave ~180ms ease-in (exit-faster-than-enter). */
.drw-enter-active .drw-bd,
.drw-leave-active .drw-bd {
  transition: opacity .22s ease, backdrop-filter .22s ease, -webkit-backdrop-filter .22s ease;
}
.drw-leave-active .drw-bd {
  transition-duration: .16s;
}
.drw-enter-active .drw {
  transition: transform .32s cubic-bezier(.22, 1, .36, 1);
}
.drw-leave-active .drw {
  transition: transform .2s cubic-bezier(.55, 0, 1, .45);
}
.drw-enter-from .drw-bd,
.drw-leave-to .drw-bd {
  opacity: 0;
  -webkit-backdrop-filter: blur(0);
  backdrop-filter: blur(0);
}
.drw-enter-from .drw,
.drw-leave-to .drw {
  transform: translateX(100%);
}

/* ─── Mobile ──
 * На мобильных drawer превращается в центрированную модалку с fade-in
 * (вместо стандартного slide-from-right, который выглядит обрезанным
 * на узких экранах). */
@media (max-width: 640px) {
  .drw {
    position: absolute;
    top: 50%;
    left: 50%;
    right: auto;
    bottom: auto;
    transform: translate(-50%, -50%);
    width: calc(100vw - 24px);
    max-width: 420px;
    max-height: 86vh;
    border-radius: var(--r-2xl);
    box-shadow: var(--shadow-xl);
  }

  /* Анимация на мобильном — fade + лёгкий scale-up, синхронно с blur */
  .drw-enter-active .drw,
  .drw-leave-active .drw {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
  }
  .drw-enter-from .drw,
  .drw-leave-to .drw {
    transform: translate(-50%, -50%) scale(0.92);
    opacity: 0;
  }
}
</style>

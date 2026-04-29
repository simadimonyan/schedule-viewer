<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Group, Teacher } from '../../types/schedule'
import { getCourses, getGroupLevels, searchGroups, searchTeachers } from '../../api/schedule'
import { EVENTS, trackGoal } from '../../utils/analytics'

/* TTL-кеширование api-функций живёт в `src/api/cache.ts`. Здесь только
 * `setSimple`/`getSimple` — это персистентные user-preferences (выбранный
 * курс/уровень), и кеш расписания их не заменяет. */
function setSimple(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getSimple<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const RECENT_KEY = 'recent_schedules'
const MAX_RECENT = 5

function getRecent() {
  const raw = localStorage.getItem(RECENT_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Array<{ type: Mode; id: string }>
  } catch {
    return []
  }
}

function saveRecent(type: Mode, id: string) {
  const current = getRecent().filter(r => !(r.type === type && r.id === id))
  const updated = [{ type, id }, ...current].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  recent.value = updated
}

const recent = ref<Array<{ type: Mode; id: string }>>(getRecent())

type Mode = 'group' | 'teacher'

const router = useRouter()

/* Mode (group / teacher) — поднят на уровень родителя через v-model,
 * чтобы внешние блоки (TopList, HomeSidebar) могли реагировать на
 * переключение плашки. Если родитель не передаёт v-model, defineModel
 * создаст локальное состояние с дефолтом 'group'. */
const mode = defineModel<Mode>('mode', { default: 'group' })

/* Эмиттим состояние фокуса поиска в родителя — HomePage использует это,
 * чтобы блюрить плавающие top/online блоки во время активного поиска. */
const emit = defineEmits<{
  (e: 'update:focused', value: boolean): void
}>()

// Groups
const courses = ref<number[]>([])
const selectedCourse = ref<number | null>(null)
const levels = ref<string[]>([])
const selectedLevel = ref<string>('')
const groups = ref<Group[]>([])
const groupQuery = ref('')

// Teachers
const department = ref('')
const teachers = ref<Teacher[]>([])
const teacherQuery = ref('')

const loading = ref(false)
const error = ref<string | null>(null)

/* Форма обучения (Очная/Заочная/Очно-заочная) — фильтр чипами.
 * Доступные формы вычисляются из текущих загруженных групп: чипы
 * показываются только когда есть >= 2 различных значений. */
const selectedStudyForm = ref<string>('')

const availableStudyForms = computed(() => {
  const set = new Set<string>()
  groups.value.forEach((g) => {
    if (g.studyForm) set.add(g.studyForm)
  })
  return Array.from(set).sort()
})

const showStudyFormChips = computed(
  () => mode.value === 'group' && availableStudyForms.value.length >= 2,
)

const filteredGroups = computed(() => {
  let data = groups.value
  if (selectedStudyForm.value) {
    data = data.filter((g) => g.studyForm === selectedStudyForm.value)
  }
  const q = groupQuery.value.trim().toLowerCase()
  if (q) {
    data = data.filter((g) => g.name.toLowerCase().includes(q))
  }
  return data
})

watch(availableStudyForms, (forms) => {
  // Если сохранённой формы больше нет в списке — сбрасываем
  if (selectedStudyForm.value && !forms.includes(selectedStudyForm.value)) {
    selectedStudyForm.value = ''
  }
})

const filteredTeachers = computed(() => {
  const q = teacherQuery.value.trim().toLowerCase()
  console.log('teacher query:', q, 'teachers:', teachers.value.length)
  if (!q) return teachers.value
  const filtered = teachers.value.filter((t) => t.label.toLowerCase().includes(q))
  console.log('filtered teachers:', filtered)
  return filtered
})

const loadCourses = async () => {
  console.log('Loading courses...')
  try {
    // API-функция сама обслужит запрос из кеша при наличии. Колбэки
    // нужны только для аналитики — отделяем "сходили в сеть" от
    // "ответили из кеша".
    let fromCache = false
    const res = await getCourses({
      onCacheHit: () => (fromCache = true),
    })
    console.log('Courses loaded:', res.courses, 'fromCache:', fromCache)
    const sorted = [...res.courses].sort((a, b) => a - b)
    courses.value = sorted

    // не перезаписываем выбранный курс, если он уже восстановлен
    if (!selectedCourse.value) {
      selectedCourse.value = sorted[0] ?? null
    }

    trackGoal(
      fromCache ? EVENTS.CACHED_COURSES : EVENTS.FETCH_COURSES,
      { count: sorted.length },
    )
  } catch (e) {
    console.error('Failed to load courses:', e)
    throw e
  }
}

const loadLevels = async () => {
  if (!selectedCourse.value) return

  let fromCache = false
  const res = await getGroupLevels(selectedCourse.value, {
    onCacheHit: () => (fromCache = true),
  })
  // В контекстном меню уровень должен быть: "Все" (отдельно) + дальше.
  // Сортируем по возрастанию количества символов (короче -> раньше),
  // при равной длине — по алфавиту для кириллицы.
  levels.value = [...res.levels].sort((a, b) => {
    const lenDiff = a.length - b.length
    return lenDiff !== 0 ? lenDiff : a.localeCompare(b, 'ru')
  })

  // если сохранённый уровень существует и входит в список — оставляем его
  if (selectedLevel.value && res.levels.includes(selectedLevel.value)) {
    // ничего не делаем
  } else {
    selectedLevel.value = ''
  }

  trackGoal(
    fromCache ? EVENTS.CACHED_LEVELS : EVENTS.FETCH_LEVELS,
    { course: selectedCourse.value, count: levels.value.length },
  )
}

const loadGroups = async () => {
  if (!selectedCourse.value) {
    console.log('loadGroups: selectedCourse is null, skipping')
    return
  }

  loading.value = true
  error.value = null
  try {
    let fromCache = false
    const res = await searchGroups(
      selectedCourse.value,
      selectedLevel.value || undefined,
      { onCacheHit: () => (fromCache = true) },
    )
    console.log(
      'loadGroups: response groups count:',
      res.groups.length,
      'fromCache:',
      fromCache,
    )
    groups.value = res.groups
    trackGoal(
      fromCache ? EVENTS.CACHED_GROUPS_LIST : EVENTS.FETCH_GROUPS_LIST,
      {
        course: selectedCourse.value,
        level: selectedLevel.value || 'all',
        count: res.groups.length,
      },
    )
  } catch (e) {
    console.error('loadGroups: API error:', e)
    error.value = (e as { message?: string }).message || 'Не удалось загрузить группы'
    groups.value = []
  } finally {
    loading.value = false
  }
}

const loadTeachers = async () => {
  loading.value = true
  error.value = null
  try {
    let fromCache = false
    const res = await searchTeachers(
      department.value.trim() || undefined,
      { onCacheHit: () => (fromCache = true) },
    )
    console.log(
      'loadTeachers: response teachers count:',
      res.teachers.length,
      'fromCache:',
      fromCache,
    )
    teachers.value = res.teachers
    trackGoal(
      fromCache ? EVENTS.CACHED_TEACHERS_LIST : EVENTS.FETCH_TEACHERS_LIST,
      {
        department: department.value.trim() || 'all',
        count: res.teachers.length,
      },
    )
  } catch (e) {
    console.error('loadTeachers: API error:', e)
    error.value = (e as { message?: string }).message || 'Не удалось загрузить преподавателей'
    teachers.value = []
  } finally {
    loading.value = false
  }
}

const openGroup = (g: Group) => {
  saveRecent('group', g.name)
  trackGoal(EVENTS.SELECT_GROUP, {
    groupName: g.name,
    course: g.course,
    level: g.level,
    studyForm: g.studyForm,
  })
  // Заочные группы — отдельная семантика "сессия", дублируем как в мобиле.
  if (g.studyForm && /заочн/i.test(g.studyForm)) {
    trackGoal(EVENTS.OPEN_GROUP_SESSION, { groupName: g.name })
  }
  router.push({ name: 'group-schedule', params: { groupId: g.name } })
}

const openTeacher = (t: Teacher) => {
  saveRecent('teacher', t.label)
  trackGoal(EVENTS.SELECT_TEACHER, {
    teacherName: t.label,
    department: t.department,
  })
  router.push({ name: 'teacher-schedule', params: { teacherId: t.label } })
}

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    // Восстанавливаем пользовательские preferences (не TTL-кеш — это
    // именно сохранённый выбор курса/уровня).
    const savedCourse = getSimple<number>('selected_course')
    const savedLevel = getSimple<string>('selected_level')

    if (savedCourse) selectedCourse.value = savedCourse
    if (savedLevel !== null) selectedLevel.value = savedLevel

    // Все четыре loaders проходят через API-кеш (см. src/api/cache.ts):
    // если данные были получены за последний час — ответят без сети.
    // In-flight dedup гарантирует, что параллельные вызовы не плодят
    // несколько одинаковых запросов.
    await loadCourses()
    await loadLevels()
    await loadGroups()
    await loadTeachers()
  } catch (e) {
    error.value = (e as { message?: string }).message || 'Не удалось загрузить данные'
  } finally {
    loading.value = false
  }
})

/* `selectedCourseUserChanged` блокирует трекинг "Выбрать курс" на самой
 * первой инициализации (когда mounted сначала раскручивает кеш и ставит
 * `selectedCourse = cachedCourses[0]`). Реальный пользовательский выбор
 * фиксируем со второго срабатывания вотчера. То же — для уровня и
 * режима ниже. */
let selectedCourseInitDone = false
watch(selectedCourse, async (next, prev) => {
  if (mode.value !== 'group') return
  setSimple('selected_course', selectedCourse.value)

  if (selectedCourseInitDone && next !== prev && next !== null) {
    trackGoal(EVENTS.SELECT_COURSE, { course: next })
  }
  selectedCourseInitDone = true

  // затемняем лист и показываем спинер
  loading.value = true
  groups.value = []

  await loadLevels()
  await loadGroups()

  loading.value = false
})

let selectedLevelInitDone = false
watch(selectedLevel, async (next, prev) => {
  if (mode.value !== 'group') return

  setSimple('selected_level', selectedLevel.value)

  if (selectedLevelInitDone && next !== prev && next) {
    trackGoal(EVENTS.SELECT_LEVEL, {
      course: selectedCourse.value,
      level: next,
    })
  }
  selectedLevelInitDone = true

  loading.value = true
  await loadGroups()
  loading.value = false
})

/* Включить режим студента / преподавателя — событие шлём только при
 * РУЧНОМ переключении плашек, а не при initial mount или восстановлении
 * сохранённого режима из localStorage. */
let modeInitDone = false
watch(mode, (next, prev) => {
  if (modeInitDone && next !== prev) {
    trackGoal(
      next === 'group' ? EVENTS.ENABLE_STUDENT_MODE : EVENTS.ENABLE_TEACHER_MODE,
    )
  }
  modeInitDone = true

  showGroupList.value = false
})

// search

const showGroupList = ref(false)
const showCourseMenu = ref(false)
const showLevelMenu = ref(false)

/* Модальное окно «Фильтры» — содержит выбор курса / уровня (и формы обучения).
 * Открывается по кнопке-иконке в строке поиска. */
const showFiltersModal = ref(false)

function openFiltersModal() {
  showFiltersModal.value = true
}

function closeFiltersModal() {
  showFiltersModal.value = false
}

/* Сбрасывает все фильтры к дефолтам:
 * — selectedCourse: первый курс из списка (или null если их нет)
 * — selectedLevel: '' (= «Все»)
 * — selectedStudyForm: '' (= «Все»)
 * Модалка остаётся открытой, чтобы пользователь видел эффект сброса. */
function resetFilters() {
  selectedCourse.value = courses.value[0] ?? null
  selectedLevel.value = ''
  selectedStudyForm.value = ''
}

const activeFiltersCount = computed(() => {
  let n = 0
  if (selectedCourse.value !== null) n++
  if (selectedLevel.value) n++
  if (selectedStudyForm.value) n++
  return n
})

const searchBarRef = ref<HTMLElement | null>(null)
const searchFocused = ref(false)

const closeAllMenus = () => {
  showCourseMenu.value = false
  showLevelMenu.value = false
}

// (Watcher на `mode` объявлен выше — он же закрывает дропдаун
//  и шлёт "Включить режим студента/преподавателя" в analytics.)

const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeAllMenus()
    showGroupList.value = false
    searchBarRef.value?.blur()
  }
}

const handleGroupFocus = () => {
  showGroupList.value = true
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.dropdown-wrapper')) {
    closeAllMenus()
    showGroupList.value = false
  }
}

const closeOverlay = () => {
  showGroupList.value = false
  closeAllMenus()
  searchBarRef.value?.querySelector<HTMLInputElement>('input')?.blur()
}

const onClear = async () => {
  if (!hasQuery.value) return

  if (mode.value === 'group') groupQuery.value = ''
  else teacherQuery.value = ''

  showGroupList.value = false
  closeAllMenus()

  await nextTick()

  const input = searchBarRef.value?.querySelector<HTMLInputElement>('input')
  if (input) {
    input.value = ''
    input.focus()
  }
}

const hasQuery = computed(() => (mode.value === 'group' ? groupQuery.value.trim() : teacherQuery.value.trim()))

const handleBarFocusIn = () => {
  searchFocused.value = true
}

const handleBarFocusOut = (e: FocusEvent) => {
  const next = e.relatedTarget as HTMLElement | null
  if (next && searchBarRef.value?.contains(next)) return
  searchFocused.value = false
}

/* Эффективный фокус-стейт: блюр top+online должен быть активен пока
 * либо input в фокусе, либо открыт dropdown — иначе при клике внутри
 * dropdown'а (form-chips, items) blur снимается, хотя UI остаётся
 * в активном поисковом режиме. */
const isSearchActive = computed(() => searchFocused.value || showGroupList.value)
watch(isSearchActive, (v) => emit('update:focused', v))
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEsc)
})
</script>

<template>
  <div class="search-overlay-wrapper" :class="{ 'is-search-focused': searchFocused }">
    <div
      v-if="searchFocused || showGroupList"
      class="overlay"
      @click="closeOverlay"
    />

    <p v-if="error" class="error">{{ error }}</p>

    <div class="section">
      <!-- Сегментный переключатель «Группы / Преподаватели» — вынесен над
           поисковой строкой для удобства использования. -->
      <div class="mode-toggle" role="tablist">
        <button
          type="button"
          role="tab"
          class="mode-btn"
          :class="{ active: mode === 'group' }"
          :aria-selected="mode === 'group'"
          @click="mode = 'group'; closeAllMenus()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Группы
        </button>
        <button
          type="button"
          role="tab"
          class="mode-btn"
          :class="{ active: mode === 'teacher' }"
          :aria-selected="mode === 'teacher'"
          @click="mode = 'teacher'; closeAllMenus()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Преподаватели
        </button>
      </div>

      <div class="dropdown-wrapper">
          <div
            ref="searchBarRef"
            class="search-bar unified"
            @focusin="handleBarFocusIn"
            @focusout="handleBarFocusOut"
          >
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                fill-rule="evenodd"
                d="M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM2 10.5a8.5 8.5 0 1 1 15.2 5.2l3.65 3.65a1 1 0 0 1-1.42 1.42l-3.65-3.65A8.5 8.5 0 0 1 2 10.5Z"
              />
            </svg>
            <!-- Mode-aware input: пара v-if/v-else обернута в Transition,
                 чтобы placeholder и значение плавно сменялись при
                 переключении group ↔ teacher. -->
            <Transition name="input-swap" mode="out-in">
              <input
                v-if="mode === 'group'"
                key="group-input"
                v-model="groupQuery"
                class="search-input"
                placeholder="Поиск группы..."
                @focus="showGroupList = true"
              />
              <input
                v-else
                key="teacher-input"
                v-model="teacherQuery"
                class="search-input"
                placeholder="Поиск преподавателя..."
                @focus="handleGroupFocus"
              />
            </Transition>

            <template v-if="searchFocused">
              <button
                type="button"
                class="btn-clear"
                aria-label="Очистить"
                :aria-disabled="!hasQuery"
                :class="{ 'is-disabled': !hasQuery }"
                @mousedown.prevent
                @click.prevent="onClear"
              >
                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </template>

            <!-- Кнопка-иконка фильтров (только для режима «Группы») —
                 открывает модалку с выбором Курс / Уровень / Форма.
                 Wrapped в Transition: при переключении mode плавно
                 fade+scale, не «выбрасываем» из layout мгновенно. -->
            <Transition name="btn-pop">
              <span v-if="mode === 'group'" class="filters-slot">
                <span class="sep" aria-hidden="true" />
                <button
                  type="button"
                  class="btn-filters"
                  :class="{ 'has-active': activeFiltersCount > 0 }"
                  aria-label="Фильтры"
                  @mousedown.prevent
                  @click.prevent="openFiltersModal"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6"/>
                    <line x1="7" y1="12" x2="17" y2="12"/>
                    <line x1="10" y1="18" x2="14" y2="18"/>
                  </svg>
                  <span v-if="activeFiltersCount > 0" class="btn-filters-badge">{{ activeFiltersCount }}</span>
                </button>
              </span>
            </Transition>
          </div>

          <div
            v-if="mode === 'group'"
            :class="['list', { 'list-active': showGroupList }]"
          >
            <div class="list-inner">
              <!-- Чипы формы обучения: показываем только если у текущих групп
                   есть несколько форм (Очная/Заочная/Очно-заочная). -->
              <div v-if="showStudyFormChips" class="form-chips">
                <!-- @mousedown.prevent предотвращает потерю фокуса с input'а
                     при клике на чип. Без этого .search-bar теряет focus,
                     срабатывает focusout → searchFocused=false и блюр
                     top+online снимается, хотя dropdown остаётся открытым. -->
                <button
                  type="button"
                  class="form-chip"
                  :class="{ active: selectedStudyForm === '' }"
                  @mousedown.prevent
                  @click.stop="selectedStudyForm = ''"
                >
                  Все
                </button>
                <button
                  v-for="f in availableStudyForms"
                  :key="f"
                  type="button"
                  class="form-chip"
                  :class="{ active: selectedStudyForm === f }"
                  @mousedown.prevent
                  @click.stop="selectedStudyForm = f"
                >
                  {{ f }}
                </button>
              </div>

              <button
                v-for="g in filteredGroups"
                :key="g.id"
                class="item"
                type="button"
                @click="openGroup(g)"
              >
                <div class="item-avatar item-avatar--group">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div class="item-body">
                  <div class="item-title">{{ g.name }}</div>
                  <div class="item-sub">{{ g.level }} · курс {{ g.course }} · {{ g.studyForm }}</div>
                </div>
                <svg class="item-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              <div v-if="loading" class="loading">
                <div class="spinner"></div>
              </div>

              <div v-if="!loading && !filteredGroups.length" class="empty">
                Ничего не найдено
              </div>
            </div>
          </div>

          <div
            v-if="mode === 'teacher'"
            :class="['list', { 'list-active': showGroupList }]"
          >
            <div class="list-inner">
              <button
                v-for="t in filteredTeachers"
                :key="t.id"
                class="item"
                type="button"
                @click="openTeacher(t)"
              >
                <div class="item-avatar item-avatar--teacher">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div class="item-body">
                  <div class="item-title">{{ t.label }}</div>
                  <div class="item-sub">{{ t.department }}</div>
                </div>
                <svg class="item-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              <div v-if="loading" class="loading">
                <div class="spinner"></div>
              </div>

              <div v-if="!loading && !filteredTeachers.length" class="empty">
                Ничего не найдено
              </div>
            </div>
          </div>

      </div>
    </div>

    <!-- ─── Modal: фильтры (Курс / Уровень / Форма) ─── -->
    <Teleport to="body">
      <Transition name="filt">
        <div v-if="showFiltersModal" class="filt-ov" @click.self="closeFiltersModal">
          <div class="filt-modal" role="dialog" aria-label="Фильтры">
            <div class="filt-head">
              <div class="filt-title">Фильтры</div>
              <button class="filt-x" type="button" aria-label="Закрыть" @click="closeFiltersModal">
                <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="filt-section">
              <div class="filt-lbl">Курс</div>
              <div class="filt-chips">
                <button
                  v-for="c in courses"
                  :key="c"
                  type="button"
                  class="filt-chip"
                  :class="{ active: selectedCourse === c }"
                  @click="selectedCourse = c"
                >
                  {{ c }} курс
                </button>
              </div>
            </div>

            <div class="filt-section">
              <div class="filt-lbl">Уровень образования</div>
              <div class="filt-chips">
                <button
                  type="button"
                  class="filt-chip"
                  :class="{ active: !selectedLevel }"
                  @click="selectedLevel = ''"
                >
                  Все
                </button>
                <button
                  v-for="l in levels"
                  :key="l"
                  type="button"
                  class="filt-chip"
                  :class="{ active: selectedLevel === l }"
                  @click="selectedLevel = l"
                >
                  {{ l }}
                </button>
              </div>
            </div>

            <div v-if="availableStudyForms.length >= 2" class="filt-section">
              <div class="filt-lbl">Форма обучения</div>
              <div class="filt-chips">
                <button
                  type="button"
                  class="filt-chip"
                  :class="{ active: !selectedStudyForm }"
                  @click="selectedStudyForm = ''"
                >
                  Все
                </button>
                <button
                  v-for="f in availableStudyForms"
                  :key="f"
                  type="button"
                  class="filt-chip"
                  :class="{ active: selectedStudyForm === f }"
                  @click="selectedStudyForm = f"
                >
                  {{ f }}
                </button>
              </div>
            </div>

            <div class="filt-actions">
              <button
                type="button"
                class="filt-btn-secondary"
                :disabled="activeFiltersCount === 0"
                @click="resetFilters"
              >
                Сбросить
              </button>
              <button type="button" class="filt-btn-primary" @click="closeFiltersModal">
                Применить
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>


<style scoped>
.filter-wrapper {
  position: relative;
  display: inline-flex;
  justify-content: center;
}

.section {
  position: relative;
  z-index: 1300;
  max-width: 680px;
  width: 100%;
  margin: 0 auto;
  /* Центрируем mode-toggle и dropdown-wrapper по горизонтали */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dropdown-wrapper {
  position: relative;
  width: 100%;
}

/* ─── Сегментный переключатель «Группы / Преподаватели» ─── */
.mode-toggle {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  margin: 0 auto 14px;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--r-full);
  box-shadow: var(--shadow-xs);
}

.mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 16px;
  border: 0;
  background: transparent;
  border-radius: var(--r-full);
  font-size: 13px;
  font-weight: 600;
  color: var(--ds-fg-soft);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  white-space: nowrap;
}

.mode-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.mode-btn:hover {
  color: var(--ds-fg);
}

.mode-btn.active {
  background: var(--ds-accent);
  color: #fff;
  box-shadow: var(--shadow-brand);
  /* Spring-easing для плавного «зацепа» pill-фона при переключении.
   * background-color и color транзишэнятся вместе с box-shadow. */
  transition: background 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
    color 0.18s ease,
    box-shadow 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Press-feedback: subtle scale при нажатии (HIG / MD scale-feedback) */
.mode-btn:active {
  transform: scale(0.96);
  transition: transform 0.08s ease;
}

/* Иконка внутри mode-btn получает мягкое вращение при активации
 * (визуальная подсказка, что mode сменился). */
.mode-btn svg {
  transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.mode-btn.active svg {
  transform: scale(1.1);
}

/* ─── Filter trigger button (icon) ─── */
.btn-filters {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: var(--r-full);
  background: transparent;
  border: 1px solid var(--ds-border);
  color: var(--ds-fg-soft);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  font-family: inherit;
}

.btn-filters:hover {
  background: var(--ds-surface-sunk);
  color: var(--ds-fg);
  border-color: var(--ds-border-strong);
}

.btn-filters.has-active {
  background: var(--ds-accent-soft);
  border-color: var(--ds-accent-border);
  color: var(--ds-accent);
}

.btn-filters svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
}

.btn-filters-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--r-full);
  background: var(--ds-accent);
  color: #fff;
  font-size: 9.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--ds-surface);
}

/* ─── Search bar ─── */
.search-bar {
  --searchbar-height: 50px;
  --searchbar-control-height: 28px;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: var(--searchbar-height);
  padding: 0 12px;
  border-radius: var(--r-full);
  border: 1px solid var(--ds-border-strong);
  background: var(--ds-surface);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.search-bar:hover {
  box-shadow: var(--shadow-md);
}

.search-bar:focus-within {
  border-color: var(--ds-accent);
  box-shadow: 0 0 0 3px var(--ds-accent-soft), var(--shadow-md);
}

.unified { position: relative; }

.sep {
  width: 1px;
  height: 16px;
  background: var(--ds-border-strong);
  flex-shrink: 0;
}

.mode-inline {
  display: flex;
  gap: 3px;
}

.btn-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: transparent;
  color: var(--ds-fg-faint);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.btn-clear:hover:not(.is-disabled) {
  background: var(--ds-surface-sunk);
  color: var(--ds-fg);
}

.btn-clear.is-disabled {
  opacity: 0.4;
  cursor: default;
}

/* ─── Filters ─── */
.filters-inline {
  display: flex;
  gap: 3px;
  position: relative;
}

.filter-chip {
  font-size: 11px;
  font-weight: 500;
  height: var(--searchbar-control-height);
  padding: 0 9px;
  border-radius: var(--r-full);
  border: 1px solid var(--ds-border);
  background: var(--ds-surface-sunk);
  color: var(--ds-fg-soft);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  box-shadow: var(--shadow-xs);
}

.filter-chip:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

/* ─── Context menus ─── */
.menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  padding: 4px;
  border-radius: var(--r-lg);
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  box-shadow: var(--shadow-xl);
  animation: menuIn 0.2s cubic-bezier(.34,1.56,.64,1);
  transform-origin: top center;
  z-index: 1400;
}

.menu-item {
  padding: 8px 14px;
  border-radius: var(--r-sm);
  font-size: 12.5px;
  color: var(--ds-fg-muted);
  cursor: pointer;
  transition: 0.12s ease;
  white-space: nowrap;
}

.menu-item:hover {
  background: var(--ds-surface-soft);
  color: var(--ds-fg);
}

/* ─── Search input ─── */
.search-icon {
  width: 16px;
  height: 16px;
  min-width: 16px;
  flex-shrink: 0;
  color: var(--ds-fg-faint);
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--ds-fg);
  height: var(--searchbar-control-height);
}

.search-input::placeholder {
  color: var(--ds-fg-faint);
  /* Плавный fade-in placeholder'а — заметен при смене input'а */
  transition: color 0.18s ease;
}

/* ─── Input-swap (group ↔ teacher) ───
 * Cross-fade + лёгкий slide для смены input'а с placeholder'ом.
 * mode="out-in" гарантирует последовательность без overlap. */
.input-swap-enter-active,
.input-swap-leave-active {
  transition: opacity 0.18s ease, transform 0.22s var(--ease-out, ease);
}

.input-swap-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.input-swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ─── Btn-pop (filter button: появляется/исчезает при смене mode) ───
 * Spring scale-in с rotate, чтобы кнопка «выпрыгивала» естественно. */
.filters-slot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  /* transform-origin важен для красивого spring scale */
  transform-origin: center;
}

.btn-pop-enter-active {
  transition: opacity 0.22s ease,
    transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-pop-leave-active {
  transition: opacity 0.16s ease,
    transform 0.18s cubic-bezier(0.55, 0, 1, 0.45);
}

.btn-pop-enter-from {
  opacity: 0;
  transform: scale(0.6) rotate(-30deg);
}

.btn-pop-leave-to {
  opacity: 0;
  transform: scale(0.7) rotate(20deg);
}

/* ─── Dropdown list ─── */
.list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  padding: 6px;
  border-radius: var(--r-xl);
  background: rgba(255,255,255,0.98);
  backdrop-filter: blur(20px);
  border: 1px solid var(--ds-border);
  box-shadow: var(--shadow-xl);
  z-index: 1350;
  transition: max-height 0.3s cubic-bezier(.4,0,.2,1), opacity 0.2s ease;
}

[data-theme="dark"] .list {
  background: rgba(19,26,46,0.98);
}

.list-active {
  /* Адаптивный max-height: на любой высоте экрана оставляем
     значимый отступ снизу (как у Google) — минимум из жёсткого
     360px и (100vh - 360px). */
  max-height: min(360px, calc(100vh - 360px));
  opacity: 1;
}

.list-inner {
  display: flex;
  flex-direction: column;
  /* Совпадает с .list-active max-height минус padding/border */
  max-height: min(348px, calc(100vh - 372px));
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--ds-border-strong) transparent;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 7px 10px;
  border-radius: var(--r-md);
  cursor: pointer;
  transition: background 0.12s ease;
  border: none;
  background: transparent;
  width: 100%;
}

.item:hover {
  background: var(--ds-accent-soft);
}

.item:active { transform: scale(0.98); }

.item-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  background: var(--ds-surface-sunk);
  border: 1px solid var(--ds-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--ds-fg-soft);
  transition: background 0.15s, color 0.15s;
}

.item-avatar svg {
  width: 18px;
  height: 18px;
}

.item-avatar--group { color: var(--ds-accent); background: var(--ds-accent-soft); border-color: var(--ds-accent-border); }

.item:hover .item-avatar {
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
  border-color: var(--ds-accent-border);
}

.item-body {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ds-fg);
}

.item-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--ds-fg-soft);
}

.item-chevron {
  width: 14px;
  height: 14px;
  color: var(--ds-fg-faint);
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.15s, transform 0.15s;
}

.item:hover .item-chevron {
  opacity: 1;
  transform: translateX(0);
}

.empty {
  padding: 18px 14px;
  text-align: center;
  color: var(--ds-fg-faint);
  font-size: 13px;
}

.error {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--red);
}

/* ─── Loading spinner ─── */
.loading {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2.5px solid var(--ds-border);
  border-top-color: var(--ds-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@keyframes menuIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

/* ─── Overlay wrapper ─── */
.search-overlay-wrapper {
  position: relative;
  width: 100%;
}

.overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(15,23,42,0.35);
  backdrop-filter: blur(3px);
  z-index: 1200;
}

/* ─── Чипы формы обучения (Очная / Заочная / Очно-заочная) ─── */
.form-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 6px 8px;
  border-bottom: 1px solid var(--ds-border);
  margin-bottom: 4px;
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.92);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  z-index: 2;
}

[data-theme="dark"] .form-chips {
  background: rgba(19, 26, 46, 0.92);
}

.form-chip {
  height: 24px;
  padding: 0 10px;
  border-radius: var(--r-full);
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-fg-soft);
  border: 1px solid var(--ds-border);
  background: var(--ds-surface);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  font-family: inherit;
}

.form-chip:hover {
  border-color: var(--ds-accent-border);
  color: var(--ds-accent);
}

.form-chip.active {
  background: var(--ds-accent);
  color: #fff;
  border-color: var(--ds-accent);
}

/* ─── Минимальный отступ от края экрана для дропдауна (на узких экранах
       выпадающий список переставал помещаться). ─── */
.section {
  padding: 0 12px;
  box-sizing: border-box;
  max-width: 720px;
}

@media (min-width: 768px) {
  .section {
    padding: 0;
  }
}

/* ─── Modal: фильтры (Курс / Уровень / Форма) ─── */
.filt-ov {
  position: fixed;
  inset: 0;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.4);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  padding: 16px;
}

.filt-modal {
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--r-2xl);
  padding: 22px;
  box-shadow: var(--shadow-xl);
  width: 360px;
  max-width: 92vw;
  max-height: 88vh;
  overflow-y: auto;
}

.filt-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filt-title {
  font-family: var(--ds-font-display);
  font-size: 17px;
  font-weight: 800;
  color: var(--ds-fg);
  letter-spacing: -0.01em;
}

.filt-x {
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  background: var(--ds-surface-soft);
  color: var(--ds-fg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
  transition: background 0.12s;
}

.filt-x:hover {
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
}

.filt-x svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
}

.filt-section {
  margin-bottom: 16px;
}

.filt-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ds-fg-faint);
  margin-bottom: 8px;
}

.filt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filt-chip {
  height: 32px;
  padding: 0 14px;
  border-radius: var(--r-full);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ds-fg-soft);
  border: 1px solid var(--ds-border-strong);
  background: var(--ds-surface);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
}

.filt-chip:hover {
  border-color: var(--ds-accent-border);
  color: var(--ds-accent);
  background: var(--ds-accent-soft);
}

.filt-chip.active {
  background: var(--ds-accent);
  color: #fff;
  border-color: var(--ds-accent);
}

.filt-actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}

.filt-btn-primary {
  flex: 1;
  height: 42px;
  border: 0;
  border-radius: var(--r-full);
  background: var(--ds-accent);
  color: #fff;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}

.filt-btn-primary:hover {
  background: var(--brand-primary-h);
}

/* Secondary action — «Сбросить». Outlined, более тонкая визуально,
 * не конкурирует с primary CTA. Disabled при отсутствии активных
 * фильтров. */
.filt-btn-secondary {
  height: 42px;
  padding: 0 18px;
  border: 1px solid var(--ds-border-strong);
  border-radius: var(--r-full);
  background: var(--ds-surface);
  color: var(--ds-fg-muted);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  flex-shrink: 0;
}

.filt-btn-secondary:hover:not(:disabled) {
  border-color: var(--ds-accent-border);
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
}

.filt-btn-secondary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Filter modal transitions — единый transition-язык:
 * enter — spring (cubic-bezier 0.34,1.56,0.64,1) ~300ms, scale-up из 0.92
 * leave — ease-in ~180ms, exit faster than enter (Material Motion) */
.filt-enter-active,
.filt-leave-active {
  transition: opacity 0.22s ease,
    backdrop-filter 0.22s ease,
    -webkit-backdrop-filter 0.22s ease;
}
.filt-leave-active {
  transition-duration: 0.16s;
}

.filt-enter-active .filt-modal {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.22s ease;
}
.filt-leave-active .filt-modal {
  transition: transform 0.18s cubic-bezier(0.55, 0, 1, 0.45),
    opacity 0.16s ease;
}

.filt-enter-from,
.filt-leave-to {
  opacity: 0;
  -webkit-backdrop-filter: blur(0);
  backdrop-filter: blur(0);
}

.filt-enter-from .filt-modal,
.filt-leave-to .filt-modal {
  transform: scale(0.92) translateY(16px);
  opacity: 0;
}

/* ─── Mobile: компактный поисковый бар ─── */
@media (max-width: 640px) {
  .search-bar {
    --searchbar-height: 48px;
    padding: 0 10px;
    gap: 6px;
  }

  .search-input {
    font-size: 14px;
    min-width: 0;
  }

  .mode-btn {
    height: 34px;
    padding: 0 14px;
    font-size: 12.5px;
  }

  .btn-clear {
    width: 22px;
    height: 22px;
  }
}
</style>
 
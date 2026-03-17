<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Group, Teacher } from '../../types/schedule'
import { getCourses, getGroupLevels, searchGroups, searchTeachers } from '../../api/schedule'

const ONE_DAY = 24 * 60 * 60 * 1000

function setWithTTL(key: string, value: unknown, ttl: number) {
  const data = {
    value,
    expiry: Date.now() + ttl
  }
  localStorage.setItem(key, JSON.stringify(data))
}

function getWithTTL<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null

  try {
    const data = JSON.parse(raw)
    if (Date.now() > data.expiry) {
      localStorage.removeItem(key)
      return null
    }
    return data.value as T
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

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

const mode = ref<Mode>('group')

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

const filteredGroups = computed(() => {
  const q = groupQuery.value.trim().toLowerCase()
  if (!q) return groups.value
  return groups.value.filter((g) => g.name.toLowerCase().includes(q))
})

const filteredTeachers = computed(() => {
  const q = teacherQuery.value.trim().toLowerCase()
  if (!q) return teachers.value
  return teachers.value.filter((t) => t.label.toLowerCase().includes(q))
})

const loadCourses = async () => {
  const res = await getCourses()
  const sorted = [...res.courses].sort((a, b) => a - b)
  courses.value = sorted

  // не перезаписываем выбранный курс, если он уже восстановлен
  if (!selectedCourse.value) {
    selectedCourse.value = sorted[0] ?? null
  }

  setWithTTL('cached_courses', sorted, ONE_DAY)
}

const loadLevels = async () => {
  if (!selectedCourse.value) return

  const res = await getGroupLevels(selectedCourse.value)
  levels.value = res.levels

  // если сохранённый уровень существует и входит в список — оставляем его
  if (selectedLevel.value && res.levels.includes(selectedLevel.value)) {
    // ничего не делаем
  } else {
    selectedLevel.value = ''
  }

  setWithTTL(`cached_levels_${selectedCourse.value}`, res.levels, ONE_DAY)
}

const loadGroups = async () => {
  if (!selectedCourse.value) return

  const cacheKey = `cached_groups_${selectedCourse.value}_${selectedLevel.value || 'all'}`
  const cached = getWithTTL<Group[]>(cacheKey)
  if (cached) {
    groups.value = cached
    return
  }

  loading.value = true
  error.value = null
  try {
    const res = await searchGroups(selectedCourse.value, selectedLevel.value || undefined)
    groups.value = res.groups
    setWithTTL(cacheKey, res.groups, ONE_DAY)
  } catch (e) {
    error.value = (e as { message?: string }).message || 'Не удалось загрузить группы'
    groups.value = []
  } finally {
    loading.value = false
  }
}

const loadTeachers = async () => {
  const cacheKey = `cached_teachers_${department.value.trim() || 'all'}`
  const cached = getWithTTL<Teacher[]>(cacheKey)
  if (cached) {
    teachers.value = cached
    return
  }

  loading.value = true
  error.value = null
  try {
    const res = await searchTeachers(department.value.trim() || undefined)
    teachers.value = res.teachers
    setWithTTL(cacheKey, res.teachers, ONE_DAY)
  } catch (e) {
    error.value = (e as { message?: string }).message || 'Не удалось загрузить преподавателей'
    teachers.value = []
  } finally {
    loading.value = false
  }
}

const openGroup = (g: Group) => {
  saveRecent('group', g.name)
  router.push({ name: 'group-schedule', params: { groupId: g.name } })
}

const openTeacher = (t: Teacher) => {
  saveRecent('teacher', t.label)
  router.push({ name: 'teacher-schedule', params: { teacherId: t.label } })
}

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const cachedGroups = getWithTTL<Group[]>('cached_groups')
    const cachedTeachers = getWithTTL<Teacher[]>('cached_teachers')
    if (cachedGroups) groups.value = cachedGroups
    if (cachedTeachers) teachers.value = cachedTeachers

    const cachedCourses = getWithTTL<number[]>('cached_courses')
    if (cachedCourses) {
      courses.value = cachedCourses
      selectedCourse.value = cachedCourses[0] ?? null
    }

    if (selectedCourse.value) {
      const cachedLevels = getWithTTL<string[]>(`cached_levels_${selectedCourse.value}`)
      if (cachedLevels) levels.value = cachedLevels
    }

    const savedCourse = getSimple<number>('selected_course')
    const savedLevel = getSimple<string>('selected_level')

    if (savedCourse) selectedCourse.value = savedCourse
    if (savedLevel !== null) selectedLevel.value = savedLevel

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

watch(selectedCourse, async () => {
  if (mode.value !== 'group') return
  setSimple('selected_course', selectedCourse.value)

  // затемняем лист и показываем спинер
  loading.value = true
  groups.value = []

  await loadLevels()
  await loadGroups()

  loading.value = false
})

watch(selectedLevel, async () => {
  if (mode.value !== 'group') return

  setSimple('selected_level', selectedLevel.value)

  loading.value = true
  await loadGroups()
  loading.value = false
})

// search

const showGroupList = ref(false)
const showCourseMenu = ref(false)
const showLevelMenu = ref(false)

const searchBarRef = ref<HTMLElement | null>(null)
const searchFocused = ref(false)

const closeAllMenus = () => {
  showCourseMenu.value = false
  showLevelMenu.value = false
}

watch(mode, () => {
  showGroupList.value = false
})

const toggleCourseMenu = () => {
  showLevelMenu.value = false
  showCourseMenu.value = !showCourseMenu.value
}

const toggleLevelMenu = () => {
  showCourseMenu.value = false
  showLevelMenu.value = !showLevelMenu.value
}

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

const onFind = () => {
  showGroupList.value = true
  searchBarRef.value?.querySelector('input')?.focus()
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
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEsc)
})
</script>

<template>
  <div class="search-overlay-wrapper">
    <div
      v-if="showGroupList"
      class="overlay"
      @click="showGroupList=false; closeAllMenus()"
    />

    <p v-if="error" class="error">{{ error }}</p>

    <div class="section">
      <div class="dropdown-wrapper">

          <div
            ref="searchBarRef"
            class="search-bar unified"
            @focusin="handleBarFocusIn"
            @focusout="handleBarFocusOut"
          >
            <div class="mode-inline">
              <button
                class="chip"
                :class="{ 'chip-active': mode === 'group' }"
                type="button"
                @click="mode = 'group'; closeAllMenus()"
              >
                Группы
              </button>
              <button
                class="chip"
                :class="{ 'chip-active': mode === 'teacher' }"
                type="button"
                @click="mode = 'teacher'; closeAllMenus()"
              >
                Преподаватели
              </button>
            </div>
            <span class="sep" aria-hidden="true" />

            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                fill-rule="evenodd"
                d="M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM2 10.5a8.5 8.5 0 1 1 15.2 5.2l3.65 3.65a1 1 0 0 1-1.42 1.42l-3.65-3.65A8.5 8.5 0 0 1 2 10.5Z"
              />
            </svg>
            <input
              v-if="mode === 'group'"
              v-model="groupQuery"
              class="search-input"
              placeholder="Поиск группы..."
              @focus="showGroupList = true"
            />
            <input
              v-else
              v-model="teacherQuery"
              class="search-input"
              placeholder="Поиск преподавателя..."
              @focus="handleGroupFocus"
            />

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
            <span v-if="mode === 'group'" class="sep" aria-hidden="true" />
            <div v-if="mode === 'group'" class="filters-inline">

              <div class="filter-wrapper">
                <div class="filter-chip" @click.stop="toggleCourseMenu">
                  Курс: {{ selectedCourse ?? '—' }}
                </div>

                <div v-if="showCourseMenu" class="menu">
                  <div v-if="!courses.length" class="menu-item">
                    —
                  </div>
                  <div
                    v-else
                    v-for="c in courses"
                    :key="c"
                    class="menu-item"
                    @click="selectedCourse = c; closeAllMenus()"
                  >
                    {{ c }}
                  </div>
                </div>
              </div>

              <div class="filter-wrapper">
                <div class="filter-chip" @click.stop="toggleLevelMenu">
                  Уровень: {{ selectedLevel || 'Все' }}
                </div>

                <div v-if="showLevelMenu" class="menu">
                  <div
                    class="menu-item"
                    @click="selectedLevel = ''; closeAllMenus()">
                    Все
                  </div>
                  <div
                    v-for="l in levels"
                    :key="l"
                    class="menu-item"
                    @click="selectedLevel = l; closeAllMenus()"
                  >
                    {{ l }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="mode === 'group'"
            :class="['list', { 'list-active': showGroupList }]"
          >
            <div class="list-inner">
              <button
                v-for="g in filteredGroups"
                :key="g.id"
                class="item"
                type="button"
                @click="openGroup(g)"
              >
                <div style="display: flex; flex-direction: row; gap: 10px; align-items: center;">
                  <img src="@/assets/group.png" width="32px" height="32">
                  <div>
                    <div class="item-title">{{ g.name }}</div>
                    <div class="item-sub">
                      {{ g.level }} · курс {{ g.course }} · {{ g.studyForm }}
                    </div>
                  </div>
                </div>
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
                <div style="display: flex; flex-direction: row; gap: 13px; align-items: center;">
                  <img src="@/assets/teacher.png" width="25px">
                  <div>
                    <div class="item-title">{{ t.label }}</div>
                    <div class="item-sub">
                      {{ t.department }}
                    </div>
                  </div>
                </div>
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
  z-index: 1001;
  max-width: 820px;
  width: 96%;
  margin: 0 auto;
}

.dropdown-wrapper {
  position: relative;
}

.chip {
  font-size: 0.72rem;
  height: var(--searchbar-control-height);
  padding: 0 0.65rem;
  border-radius: 9999px;
  border: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  will-change: transform;
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.chip-active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
}

.chip:not(.chip-active):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0,0,0,0.12);
}

.chip::after {
  transform: scale(0.85);
  transition: opacity 0.25s ease, transform 0.3s cubic-bezier(.34,1.56,.64,1);
}

.chip-active::after {
  transform: scale(1);
}

.error {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: #b42318;
}

.controls {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.65rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 140px;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: #666;
}

.field-input {
  border-radius: 999px;
  border: 1px solid var(--border);
  padding: 0.55rem 0.9rem;
  background: #ffffff;
  color: var(--text);
  outline: none;
  width: 100%;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primarySoft);
}

select.field-input {
  background-image: url("data:image/svg+xml;utf8,<svg fill='%23666' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M5 7l5 5 5-5z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  background-size: 1rem;
  padding-right: 2rem;
  cursor: pointer;
}

select.field-input::-ms-expand {
  display: none;
}

.btn {
  border-radius: 999px;
  border: none;
  padding: 0.55rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #ffffff;
  background: var(--primary);
  cursor: pointer;
}

.search-bar {
  --searchbar-height: 44px;
  --searchbar-control-height: 30px;

  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: var(--searchbar-height);
  padding: 0 0.9rem;
  border-radius: 9999px;
  border: 1px solid var(--border);
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  appearance: none;
  -webkit-appearance: none;
}

.search-bar:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

.search-bar:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primarySoft);
}

.unified {
  position: relative;
}

.sep {
  width: 1px;
  height: 18px;
  background: rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.mode-inline {
  display: flex;
  gap: 0.3rem;
}

.btn-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--searchbar-control-height);
  height: var(--searchbar-control-height);
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-clear:hover:not(.is-disabled) {
  background: rgba(0, 0, 0, 0.06);
  color: #0f172a;
}

.btn-clear.is-disabled {
  opacity: 0.4;
  cursor: default;
}

.btn-clear.is-disabled:hover {
  background: transparent;
  color: #64748b;
}

.filters-inline {
  display: flex;
  gap: 0.5rem;
  position: relative;
}

.filter-chip {
  font-size: 0.75rem;
  height: var(--searchbar-control-height);
  padding: 0 0.65rem;
  border-radius: 9999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: inline-flex;
  align-items: center;
  line-height: 1;
  will-change: transform;
}

.filter-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
}

.menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  min-width: unset;
  padding: 0.25rem;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
  animation: menuIn 0.28s cubic-bezier(.34,1.56,.64,1);
  transform-origin: top center;
  z-index: 1100;
}

.menu-item {
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  font-size: 0.82rem;
  color: #334155;
  cursor: pointer;
  transition: 0.15s ease;
}

.menu-item:hover {
  background: rgba(15, 23, 42, 0.04);
  color: #0f172a;
}


.search-icon {
  width: 18px;
  height: 18px;
  min-width: 18px;
  display: block;
  flex-shrink: 0;
  color: #0f172a;
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
  color: var(--text);
  appearance: none;
  -webkit-appearance: none;
  height: var(--searchbar-control-height);
  line-height: var(--searchbar-control-height);
}

.search-input::placeholder {
  color: #94a3b8;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes menuIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

.list {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;

  max-height: 0;
  opacity: 0;
  overflow: hidden;

  padding: 6px;
  border-radius: 20px;

  background: rgba(255,255,255,0.98);
  backdrop-filter: blur(20px);

  box-shadow: 0 25px 60px rgba(0,0,0,0.25);
  z-index: 1001;

  transition:
    max-height 0.35s cubic-bezier(.4,0,.2,1),
    opacity 0.25s ease,
    padding 0.25s ease;
}

.list-active {
  max-height: 350px;
  opacity: 1;
}

.list-inner {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  max-height: 338px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 6px;
  margin-right: 2px;
  border-radius: 14px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.25) transparent;
}

.list-inner::-webkit-scrollbar {
  width: 8px;
}

.list-inner::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
  margin: 8px 0;
}

.list-inner::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.list-inner::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.item {
  appearance: none;
  -webkit-appearance: none;
  border: none;
  background: transparent;

  text-align: left;
  padding: 12px 14px;
  margin: 2px 0;

  border-radius: 14px;
  cursor: pointer;

  transition: 0.18s ease, transform 0.08s ease;
}

.item:hover {
  background: rgba(0,0,0,0.06);
}

.item:active {
  transform: scale(0.98);
}

.item-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.item-sub {
  margin-top: 2px;
  font-size: 0.8rem;
  opacity: 0.7;
}

.empty {
  appearance: none;
  -webkit-appearance: none;
  border: none;
  background: transparent;

  text-align: left;
  padding: 12px 14px;
  margin: 2px 0;

  border-radius: 14px;
  cursor: pointer;

  transition: 0.18s ease, transform 0.08s ease;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.search-overlay-wrapper {
  position: relative;
  width: 100%;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.35);
  z-index: 999;
}
</style>
 
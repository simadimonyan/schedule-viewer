<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Group, Teacher } from '../../types/schedule'
import { getCourses, getGroupLevels, searchGroups, searchTeachers } from '../../api/schedule'

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
  selectedCourse.value = sorted[0] ?? null
}

const loadLevels = async () => {
  if (!selectedCourse.value) return
  const res = await getGroupLevels(selectedCourse.value)
  levels.value = res.levels
  selectedLevel.value = ''
}

const loadGroups = async () => {
  if (!selectedCourse.value) return
  loading.value = true
  error.value = null
  try {
    const res = await searchGroups(selectedCourse.value, selectedLevel.value || undefined)
    groups.value = res.groups
  } catch (e) {
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
    const res = await searchTeachers(department.value.trim() || undefined)
    teachers.value = res.teachers
  } catch (e) {
    error.value = (e as { message?: string }).message || 'Не удалось загрузить преподавателей'
    teachers.value = []
  } finally {
    loading.value = false
  }
}

const openGroup = (g: Group) => {
  router.push({ name: 'group-schedule', params: { groupId: g.name } })
}

const openTeacher = (t: Teacher) => {
  router.push({ name: 'teacher-schedule', params: { teacherId: t.label } })
}

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
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
  await loadLevels()
  await loadGroups()
})

watch(selectedLevel, async () => {
  if (mode.value !== 'group') return
  selectedCourse.value = 1
  await loadGroups()
})

// search

const showGroupList = ref(false)
const showCourseMenu = ref(false)
const showLevelMenu = ref(false)

const searchBarRef = ref<HTMLElement | null>(null)

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
    ></div>

    <div class="card">

      <p v-if="error" class="error">{{ error }}</p>

      <div class="section">
        <div class="dropdown-wrapper">

          <div ref="searchBarRef" class="search-bar unified">
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

            <svg class="search-icon" viewBox="0 0 24 24">
              <path fill="currentColor"
                d="M21 20l-5.2-5.2a7 7 0 10-1 1L20 21zM5 11a6 6 0 1112 0A6 6 0 015 11z"/>
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

            <div v-if="mode === 'group'" class="filters-inline">

              <div class="filter-wrapper">
                <div class="filter-chip" @click.stop="toggleCourseMenu">
                  Курс: {{ selectedCourse ?? '—' }}
                </div>

                <div v-if="showCourseMenu" class="menu">
                  <div
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
                    @click="selectedLevel = ''; closeAllMenus()"
                  >
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
            <button
              v-for="g in filteredGroups"
              :key="g.id"
              class="item"
              type="button"
              @click="openGroup(g)"
            >
              <div class="item-title">{{ g.name }}</div>
              <div class="item-sub">
                {{ g.level }} · курс {{ g.course }} · {{ g.studyForm }}
              </div>
            </button>

            <div v-if="loading" class="loading">
              <div class="spinner"></div>
            </div>

            <div v-if="!loading && !filteredGroups.length" class="empty">
              Ничего не найдено
            </div>
          </div>

          <div
            v-if="mode === 'teacher'"
            :class="['list', { 'list-active': showGroupList }]"
          >
            <button
              v-for="t in filteredTeachers"
              :key="t.id"
              class="item"
              type="button"
              @click="openTeacher(t)"
            >
              <div class="item-title">{{ t.label }}</div>
              <div class="item-sub">
                {{ t.department }}
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
}

.dropdown-wrapper {
  position: relative;
}

.chip {
  font-size: 0.75rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  will-change: transform;
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

.card {
  position: relative;
  z-index: 1000;
  background: rgba(20, 118, 237, 0.037);
  backdrop-filter: blur(30px);
  padding: 7px;
  border-radius: 30px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  max-width: 720px;
  width: 90%;
  margin: 0 auto;
  transition: padding 0.3s ease, box-shadow 0.3s ease;
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
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #ffffff;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
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

.mode-inline {
  display: flex;
  gap: 0.4rem;
}

.filters-inline {
  display: flex;
  gap: 0.5rem;
  position: relative;
}

.filter-chip {
  font-size: 0.75rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.05);
  cursor: pointer;
  white-space: nowrap;
  transition: 0.2s ease;
}

.filter-chip:hover {
  background: rgba(0, 0, 0, 0.08);
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 140px;
  padding: 0.35rem;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid var(--border);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
  animation: menuIn 0.28s cubic-bezier(.34,1.56,.64,1);
  transform-origin: top left;
  z-index: 1100;
}

.menu-item {
  padding: 0.45rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: 0.15s ease;
}

.menu-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  font-size: 0.95rem;
  color: var(--text);
  appearance: none;
  -webkit-appearance: none;
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

.list {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;

  display: flex;
  flex-direction: column;
  gap: 0.55rem;

  max-height: 0;
  opacity: 0;
  overflow: hidden;

  padding: 0 6px;
  border-radius: 20px;

  background: rgba(255,255,255,0.98);
  backdrop-filter: blur(20px);

  box-shadow: 0 25px 60px rgba(0,0,0,0.25);
  z-index: 999;

  transition:
    max-height 0.35s cubic-bezier(.4,0,.2,1),
    opacity 0.25s ease,
    padding 0.25s ease;
}

.list-active {
  max-height: 350px;
  opacity: 1;
  overflow-y: auto;
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
  z-index: 1000;
}
</style>
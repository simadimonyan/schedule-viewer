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
  courses.value = res.courses
  selectedCourse.value = res.courses[0] ?? null
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
  await loadGroups()
})
</script>

<template>
  <div class="card">
    <div class="mode-switch">
      <button
        class="chip"
        :class="{ 'chip-active': mode === 'group' }"
        type="button"
        @click="mode = 'group'"
      >
        Группы
      </button>
      <button
        class="chip"
        :class="{ 'chip-active': mode === 'teacher' }"
        type="button"
        @click="mode = 'teacher'"
      >
        Преподаватели
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="mode === 'group'" class="section">
      <div class="controls">
        <label class="field">
          <span class="field-label">Курс</span>
          <select v-model.number="selectedCourse" class="field-input">
            <option v-for="c in courses" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">Уровень</span>
          <select v-model="selectedLevel" class="field-input">
            <option value="">Все</option>
            <option v-for="l in levels" :key="l" :value="l">{{ l }}</option>
          </select>
        </label>

        <label class="field search">
          <span class="field-label">Поиск группы</span>
          <input v-model="groupQuery" class="field-input" placeholder="Начните вводить название..." />
        </label>
      </div>

      <div class="list">
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

        <div v-if="!loading && !filteredGroups.length" class="empty">
          Ничего не найдено
        </div>
      </div>
    </div>

    <div v-else class="section">
      <div class="controls">
        <label class="field">
          <span class="field-label">Кафедра (опционально)</span>
          <input v-model="department" class="field-input" placeholder="Например: Кафедра..." />
        </label>

        <button class="btn" type="button" @click="loadTeachers">
          Обновить список
        </button>

        <label class="field search">
          <span class="field-label">Поиск преподавателя</span>
          <input v-model="teacherQuery" class="field-input" placeholder="Начните вводить ФИО..." />
        </label>
      </div>

      <div class="list">
        <button
          v-for="t in filteredTeachers"
          :key="t.id"
          class="item"
          type="button"
          @click="openTeacher(t)"
        >
          <div class="item-title">{{ t.label }}</div>
          <div class="item-sub">{{ t.department }}</div>
        </button>

        <div v-if="!loading && !filteredTeachers.length" class="empty">
          Ничего не найдено
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--surface);
  border-radius: var(--radiusLg);
  border: 1px solid var(--border);
  padding: 1rem;
  box-shadow: var(--shadow);
}

.mode-switch {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.chip {
  font-size: 0.85rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.chip-active {
  background: var(--primary);
  border-color: transparent;
  color: #ffffff;
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
}

.field-label {
  font-size: 0.8rem;
  color: var(--muted);
}

.field-input {
  border-radius: var(--radiusMd);
  border: 1px solid var(--border);
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text);
  outline: none;
}

.field-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primarySoft);
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

.list {
  margin-top: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.item {
  text-align: left;
  padding: 0.75rem 0.85rem;
  border-radius: var(--radiusLg);
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.75);
  cursor: pointer;
}

.item:hover {
  border-color: var(--primaryBorder);
  box-shadow: 0 0 0 3px var(--primarySoft);
}

.item-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.item-sub {
  margin-top: 0.15rem;
  font-size: 0.8rem;
  color: var(--muted);
}

.empty {
  padding: 0.75rem;
  color: var(--muted);
  text-align: center;
}

@media (min-width: 900px) {
  .controls {
    grid-template-columns: 180px 220px 1fr;
    align-items: end;
  }

  .controls .search {
    grid-column: span 3;
  }
}
</style>


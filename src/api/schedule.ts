import type {
  ScheduleResponse,
  GroupsSearchResponse,
  GroupsLevelsResponse,
  GroupsCoursesResponse,
  TeachersSearchResponse,
  WeekConfigurationResponse,
} from '../types/schedule'
import { apiGet } from './client'

export interface ScheduleParams {
  weekCount: number // 1 или 2 (четность недели)
  dayWeek?: string // день недели (опционально)
  date?: string // дата в формате "10.11" или "full" (опционально)
}

function toQuery(params: ScheduleParams): Record<string, string | number | boolean | undefined> {
  return {
    weekCount: params.weekCount,
    dayWeek: params.dayWeek,
    date: params.date,
  }
}

// Группы
export function getGroup(groupName: string) {
  return apiGet<{ id: number; name: string; course: number; level: string; studyForm: string }>(
    `/api/v1/groups/${encodeURIComponent(groupName)}`,
  )
}

export function searchGroups(course: number, level?: string) {
  const query: Record<string, string | number> = { course }
  if (level) {
    query.level = level
  }
  return apiGet<GroupsSearchResponse>(`/api/v1/groups/search`, { query })
}

export function getGroupLevels(course: number) {
  return apiGet<GroupsLevelsResponse>(`/api/v1/groups/levels`, {
    query: { course },
  })
}

export function getCourses() {
  return apiGet<GroupsCoursesResponse>(`/api/v1/groups/courses`)
}

export function getGroupSchedule(groupName: string, params: ScheduleParams) {
  return apiGet<ScheduleResponse>(`/api/v1/groups/schedule`, {
    query: {
      group: groupName,
      ...toQuery(params),
    },
  })
}

// Преподаватели
export function getTeacher(teacherName: string) {
  return apiGet<{ id: number; label: string; department: string }>(
    `/api/v1/teachers/${encodeURIComponent(teacherName)}`,
  )
}

export function searchTeachers(department?: string) {
  const query: Record<string, string> = {}
  if (department) {
    query.department = department
  }
  return apiGet<TeachersSearchResponse>(`/api/v1/teachers/search`, { query })
}

export function getTeacherSchedule(teacherName: string, params: ScheduleParams) {
  return apiGet<ScheduleResponse>(`/api/v1/teachers/schedule`, {
    query: {
      teacher: teacherName,
      ...toQuery(params),
    },
  })
}

// Конфигурация
export function getCurrentWeekCount() {
  return apiGet<WeekConfigurationResponse>(`/api/v1/configuration/week`)
}


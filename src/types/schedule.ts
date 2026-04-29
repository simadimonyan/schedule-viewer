// API типы для групп
export interface Group {
  id: number
  name: string
  course: number
  level: string
  studyForm: string
  /** Время последнего обновления расписания (epoch millis). Может быть null. */
  updatedAt?: number | null
}

export interface GroupsSearchResponse {
  groups: Group[]
}

export interface GroupsLevelsResponse {
  levels: string[]
}

export interface GroupsCoursesResponse {
  courses: number[]
}

// API типы для преподавателей
export interface Teacher {
  id: number
  label: string
  department: string
  /** Время последнего обновления расписания (epoch millis). Может быть null. */
  updatedAt?: number | null
}

export interface TeachersSearchResponse {
  teachers: Teacher[]
}

// API типы для расписания
export interface ScheduleItem {
  id: number
  dayWeek: string
  timePeriod: string // формат "08.00-09.30"
  weekCount: number // 1 или 2 (четность недели)
  group: Group
  lessonCount: number
  lessonType: string // "Практика", "Лекция" и т.д.
  lessonName: string
  pinnedDate: string
  teacher: Teacher
  auditory: string
  eiosLink: string
}

export interface ScheduleResponse {
  schedule: ScheduleItem[]
  /** Опционально — backend может вернуть top-level время обновления. */
  updatedAt?: number | null
}

// Конфигурация
export interface WeekConfigurationResponse {
  weekCount: number // текущая четность недели (1 или 2)
}

// Внутренние типы для отображения
export interface Lesson {
  id: number
  dayWeek: string
  timePeriod: string
  startTime: string
  endTime: string
  weekCount: number
  group: Group
  lessonCount: number
  lessonType: string
  lessonName: string
  pinnedDate: string
  teacher: Teacher
  auditory: string
  eiosLink: string
}

export interface ScheduleDay {
  date: string
  weekday: number
  dayWeek: string
  lessons: Lesson[]
}

export interface ScheduleWeek {
  weekCount: number
  startDate: string
  endDate: string
  days: ScheduleDay[]
  /** Самая поздняя дата обновления среди объектов schedule (epoch millis).
   *  null — backend не вернул updatedAt; UI скрывает badge. */
  updatedAt?: number | null
}


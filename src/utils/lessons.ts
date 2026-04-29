import type { Lesson, Group } from '../types/schedule'

/**
 * Объединённое представление занятия: если несколько Lesson относятся к одному
 * слоту (то же время, тот же предмет, тот же препод, та же аудитория) —
 * объединяем их в одну сущность с массивом групп.
 *
 * Это используется в основном для расписания преподавателя:
 * один и тот же препод может вести лекцию для нескольких групп одновременно
 * в одной аудитории — раньше показывалась только одна, остальные терялись.
 */
export interface CombinedLesson extends Lesson {
  /** Все группы, относящиеся к этому слоту (включая `lesson.group`). */
  groups: Group[]
}

/**
 * Ключ группировки — комбинация полей, которые должны совпадать у «дублирующих» уроков.
 * Намеренно НЕ учитываем group / id, потому что хотим объединить именно их.
 */
function groupingKey(l: Lesson): string {
  const teacherKey = l.teacher?.id ?? l.teacher?.label ?? ''
  return [
    l.timePeriod,
    l.lessonName,
    l.lessonType,
    l.auditory,
    teacherKey,
    l.weekCount,
  ].join('|')
}

/**
 * Объединяет дубликаты: для каждого уникального (time + subject + room + teacher)
 * собирает все группы в один CombinedLesson.
 */
export function combineLessons(lessons: Lesson[]): CombinedLesson[] {
  const map = new Map<string, CombinedLesson>()

  for (const lesson of lessons) {
    const key = groupingKey(lesson)
    const existing = map.get(key)

    if (existing) {
      // Уже есть слот с такими же параметрами — добавляем группу, если её нет
      const alreadyHasGroup = existing.groups.some(
        (g) => g.id === lesson.group?.id || g.name === lesson.group?.name,
      )
      if (!alreadyHasGroup && lesson.group) {
        existing.groups.push(lesson.group)
      }
    } else {
      map.set(key, {
        ...lesson,
        groups: lesson.group ? [lesson.group] : [],
      })
    }
  }

  return Array.from(map.values())
}

const weekdayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDay() || 7
  const start = new Date(now)
  start.setDate(now.getDate() - (day - 1))
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]!
}

export function formatDateDDMM(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

export function parseTimePeriod(timePeriod: string): { startTime: string; endTime: string } {
  // Формат "08.00-09.30" -> "08:00" и "09:30"
  const [start, end] = timePeriod.split('-')
  return {
    startTime: start?.replace('.', ':') || '',
    endTime: end?.replace('.', ':') || '',
  }
}

export function getWeekdayNumber(dayWeek: string): number {
  const index = weekdayNames.findIndex((name) => name === dayWeek)
  return index >= 0 ? index + 1 : 1
}

export function getWeekdayName(weekday: number): string {
  return weekdayNames[weekday - 1] || weekdayNames[0]!
}

export function getDaysOfWeek(startDate: Date): Array<{ date: Date; weekday: number; dayWeek: string }> {
  const days: Array<{ date: Date; weekday: number; dayWeek: string }> = []
  const current = new Date(startDate)
  for (let i = 1; i <= 7; i++) {
    days.push({
      date: new Date(current),
      weekday: i,
      dayWeek: weekdayNames[i - 1]!,
    })
    current.setDate(current.getDate() + 1)
  }
  return days
}


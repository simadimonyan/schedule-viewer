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

/** Неделя (Пн–Вс), содержащая данную дату */
export function getWeekRangeForDate(date: Date): { start: Date; end: Date } {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() || 7 // 1 = Пн, 7 = Вс
  const start = new Date(d)
  start.setDate(d.getDate() - (day - 1))
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/** Номер ISO-недели в году (1–53) */
function getISOWeekNumber(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return weekNo
}

/** Чётность недели для даты: 1 = нечётная, 2 = чётная (по номеру недели в году) */
export function getWeekParity(date: Date): 1 | 2 {
  const weekNo = getISOWeekNumber(date)
  return (weekNo % 2 === 0 ? 2 : 1) as 1 | 2
}

/** Форматирует дату в ISO YYYY-MM-DD по локальной дате (без сдвига на -1 день в других часовых поясах). */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateDDMM(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

/** Из ISO строки YYYY-MM-DD делает отображаемую дату DD.MM */
export function formatDateFromISO(iso: string): string {
  const [y, m, d] = iso.split('-')
  return d && m ? `${d}.${m}` : iso
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


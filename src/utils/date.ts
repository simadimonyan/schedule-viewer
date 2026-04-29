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
  const [, m, d] = iso.split('-')
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

/** Форматирует timestamp в человеко-читаемое относительное время на русском.
 *  Примеры: «только что», «5 минут назад», «2 часа назад», «вчера», «2 дня назад»,
 *  «12 апреля» (для давних дат). */
export function formatRelativeTime(timestamp: number, now: Date = new Date()): string {
  const diffMs = now.getTime() - timestamp
  if (diffMs < 0) return 'только что' // backend timestamp в будущем — клок-skew

  const sec = Math.floor(diffMs / 1000)
  if (sec < 30) return 'только что'
  if (sec < 60) return `${sec} сек. назад`

  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} ${pluralRu(min, ['минуту', 'минуты', 'минут'])} назад`

  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ${pluralRu(hr, ['час', 'часа', 'часов'])} назад`

  const days = Math.floor(hr / 24)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} ${pluralRu(days, ['день', 'дня', 'дней'])} назад`

  // Старше недели — абсолютная дата
  const d = new Date(timestamp)
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ]
  const day = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const currentYear = now.getFullYear()
  return year === currentYear ? `${day} ${month}` : `${day} ${month} ${year}`
}

/** Русское склонение по числу: pluralRu(5, ['груша', 'груши', 'груш']) → 'груш' */
function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  return forms[2]
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


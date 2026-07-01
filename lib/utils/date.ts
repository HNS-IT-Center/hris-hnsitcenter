/**
 * Date utilities for WIB (UTC+7) timezone handling.
 * All database timestamps are stored in UTC.
 * All display and calendar logic uses WIB.
 */

export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000 // 7 hours in ms

/**
 * Get the current date/time in WIB.
 */
export function nowWIB(): Date {
  return new Date(Date.now() + WIB_OFFSET_MS)
}

/**
 * Convert a UTC Date to the same "wall clock" moment in WIB.
 */
export function toWIB(utcDate: Date): Date {
  return new Date(utcDate.getTime() + WIB_OFFSET_MS)
}

/**
 * Get midnight UTC for the given WIB calendar day.
 * This is the value stored in DB for `date` fields.
 *
 * Example: WIB "27 Jun 2026" → UTC "2026-06-26T17:00:00Z"
 */
export function wibDayToUTC(year: number, month: number, day: number): Date {
  // midnight WIB = UTC 17:00 of the PREVIOUS day
  return new Date(Date.UTC(year, month - 1, day) - WIB_OFFSET_MS)
}

/**
 * Get today's midnight UTC from WIB perspective, 
 * represented as T00:00:00Z to match attendance records.
 */
export function todayUTC(): Date {
  const yyyyMmDd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
  return new Date(`${yyyyMmDd}T00:00:00Z`)
}

/**
 * Format a UTC date for display in WIB.
 */
export function formatWIB(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
): string {
  return new Intl.DateTimeFormat('id-ID', {
    ...options,
    timeZone: 'Asia/Jakarta',
  }).format(date)
}

/**
 * Format a Date as HH:mm in WIB.
 */
export function formatTimeWIB(date: Date): string {
  return formatWIB(date, { hour: '2-digit', minute: '2-digit' })
}

/**
 * Parse a "HH:mm" string into a Date on a given UTC day.
 * The time is interpreted as WIB.
 *
 * @param dayStartUTC - Midnight UTC of the WIB calendar day
 * @param timeStr     - "HH:mm" WIB time
 */
export function parseShiftTime(dayStartUTC: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  // dayStartUTC is already midnight UTC = 17:00 previous day
  // We need to add hours in WIB, then subtract the WIB offset
  return new Date(dayStartUTC.getTime() + WIB_OFFSET_MS + (h * 60 + m) * 60 * 1000)
}

/**
 * Check if a shift "crosses midnight" in WIB (e.g., 21:00 - 06:00).
 */
export function shiftCrossesMidnight(startTime: string, endTime: string): boolean {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return sh * 60 + sm > eh * 60 + em
}

/**
 * Relative time formatter (e.g., "5 menit lalu").
 */
export function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} jam lalu`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} hari lalu`
  return formatWIB(date, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Calculates the payroll period boundaries (26th to 25th) in UTC based on a given WIB date.
 */
export function getPayrollPeriod(baseDateUTC: Date = new Date()) {
  const wib = toWIB(baseDateUTC)
  const currentDay = wib.getUTCDate()
  const currentMonth = wib.getUTCMonth() + 1 // 1-12
  const currentYear = wib.getUTCFullYear()

  let startYear = currentYear
  let startMonth = currentMonth
  let endYear = currentYear
  let endMonth = currentMonth

  if (currentDay > 25) {
    // e.g. May 26 -> period is May 26 to June 25
    endMonth = currentMonth + 1
    if (endMonth > 12) {
      endMonth = 1
      endYear++
    }
  } else {
    // e.g. May 15 -> period is April 26 to May 25
    startMonth = currentMonth - 1
    if (startMonth < 1) {
      startMonth = 12
      startYear--
    }
  }

  const startDateUTC = wibDayToUTC(startYear, startMonth, 26)
  const endDateMidnightWIB = wibDayToUTC(endYear, endMonth, 25)
  const endDateUTC = new Date(endDateMidnightWIB.getTime() + 24 * 60 * 60 * 1000 - 1)

  // Label strictly for display on the front-end (e.g., 26 Apr - 25 Mei)
  // We format using simple strings since formatWIB formats absolute dates
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const startStr = `26 ${months[startMonth - 1]}`
  const endStr = `25 ${months[endMonth - 1]} ${endYear}`
  const periodLabel = `${startStr} - ${endStr}`

  return { startDateUTC, endDateUTC, periodLabel }
}

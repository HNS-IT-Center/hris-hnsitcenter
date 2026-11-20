/**
 * Schedule resolver: the one answer to "does this person work on this WIB day,
 * and which shift". Attendance, HRD logs, the monthly recap, payroll, the leave
 * day count and shift reminders all read it, so they agree.
 *
 * This file is pure (no database) so it can be unit tested. lib/schedule/index.ts
 * loads the data in bulk and calls resolveDay().
 *
 * Order (docs/perencanaan/pusat-pengaturan-absensi.md):
 *   1. Holiday for everyone, the person's store or department  -> HOLIDAY
 *   2. Roster override for that date                             -> OFF, or that shift
 *   3. (Phase 2: approved shift swap)
 *   4. Rotation (shiftCycle + cycleStartDate)                    -> shift of the week
 *   5. Primary shift + weekly days off                           -> shift, or OFF
 *   6. Approved full-day leave on a day the person would work    -> LEAVE
 *   7. Weekly half day, then approved half-day leave             -> start or end time moved
 *
 * Leave is checked after holidays and days off on purpose: a leave only uses up
 * days the person would otherwise work, the same rule as the leave day count.
 * On a holiday or a day off the day stays HOLIDAY or OFF.
 */
import { weekdayOfKey, wibDateKey } from '@/lib/utils/date'

/** Leave types that keep the person away the whole day. */
export const FULL_DAY_LEAVE_TYPES = ['ANNUAL_LEAVE', 'SICK', 'PERSONAL'] as const

/**
 * End of a weekly half day (User.halfDays). Same value the attendance code
 * used before; moves to Shift.halfDayEndTime in Sprint 2 (Pusat Pengaturan).
 */
export const DEFAULT_HALF_DAY_END = '14:00'

/** Placeholder the employee form stores for an empty rotation week. */
const EMPTY_ROTATION_WEEK = 'none'

export type ScheduleShift = {
  id: string
  name: string
  startTime: string // HH:mm WIB
  endTime: string // HH:mm WIB
  checkinWindowMin: number
  checkinWindowEndMin: number
}

export type ScheduleUser = {
  id: string
  shiftId: string | null
  weeklyOffDays: number[]
  halfDays: number[]
  shiftCycle: string[]
  cycleStartDate: Date | null
  storeId: string | null
  departmentId: string | null
  departmentName: string | null
}

export type ScheduleLeave = {
  id: string
  userId: string
  type: string
  startDate: Date
  endDate: Date
  halfDayType: string | null // LATE_IN | EARLY_OUT
  halfDayTime: string | null // HH:mm WIB
  isPaid: boolean
}

export type ScheduleHoliday = {
  id: string
  date: Date
  name: string
  scope: string // ALL | STORE | DEPARTMENT
  storeId: string | null
  departmentId: string | null
  departmentName: string | null
  isRainyDay: boolean
}

export type ScheduleOverride = {
  id: string
  userId: string
  date: Date
  shiftId: string | null
  isDayOff: boolean
  customStart: string | null
  customEnd: string | null
}

/** WORK and LEAVE are scheduled working days; HOLIDAY and OFF are not. */
export type DayStatus = 'WORK' | 'LEAVE' | 'HOLIDAY' | 'OFF'

/** The rule that decided the day. NONE: a working day with no shift assigned. */
export type DaySource = 'HOLIDAY' | 'OVERRIDE' | 'ROTATION' | 'PRIMARY' | 'LEAVE' | 'NONE'

export type DaySchedule = {
  userId: string
  date: string // YYYY-MM-DD, WIB
  status: DayStatus
  source: DaySource
  /** Shift of the day. On a non-working day: the shift the person would have had. */
  shift: ScheduleShift | null
  /** HH:mm WIB after overrides and half days; null when there is no shift. */
  startTime: string | null
  endTime: string | null
  /** Full-day leave (status LEAVE) or the half-day leave that shortened a WORK day. */
  leave: ScheduleLeave | null
  holiday: { id: string; name: string } | null
  isRainyDay: boolean
  isHalfDay: boolean
}

export type ResolveDayInput = {
  user: ScheduleUser
  date: string // YYYY-MM-DD, WIB
  shifts: ReadonlyMap<string, ScheduleShift>
  /** Approved leaves of this user; the ones not covering the date are ignored. */
  leaves: readonly ScheduleLeave[]
  /** Holidays; the ones for another date or another store/department are ignored. */
  holidays: readonly ScheduleHoliday[]
  override: ScheduleOverride | null
}

export function isScheduledWorkday(day: Pick<DaySchedule, 'status'>): boolean {
  return day.status === 'WORK' || day.status === 'LEAVE'
}

export function countScheduledWorkDays(days: Iterable<Pick<DaySchedule, 'status'>>): number {
  let n = 0
  for (const d of days) if (isScheduledWorkday(d)) n++
  return n
}

export function holidayAppliesTo(holiday: ScheduleHoliday, user: ScheduleUser): boolean {
  switch (holiday.scope) {
    case 'ALL':
      return true
    case 'STORE':
      return !!holiday.storeId && holiday.storeId === user.storeId
    case 'DEPARTMENT':
      return (
        (!!holiday.departmentId && holiday.departmentId === user.departmentId) ||
        (!!holiday.departmentName && holiday.departmentName === user.departmentName)
      )
    default:
      return false
  }
}

export function leaveCovers(leave: ScheduleLeave, date: string): boolean {
  return wibDateKey(leave.startDate) <= date && date <= wibDateKey(leave.endDate)
}

/** Monday of the week of a YYYY-MM-DD key. */
function mondayOf(key: string): string {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/**
 * Shift id of the rotation week that contains `date`, or null when the user
 * has no rotation or that week is empty. Week 1 is the week (Monday-Sunday)
 * containing cycleStartDate; the cycle also runs backwards before it.
 */
export function rotationShiftId(cycle: readonly string[], cycleStartDate: Date | null, date: string): string | null {
  if (!cycleStartDate || cycle.length === 0) return null
  const anchor = mondayOf(wibDateKey(cycleStartDate))
  const weeks = Math.floor((Date.parse(mondayOf(date)) - Date.parse(anchor)) / (7 * 86400000))
  const id = cycle[((weeks % cycle.length) + cycle.length) % cycle.length]
  return id && id !== EMPTY_ROTATION_WEEK ? id : null
}

export function resolveDay({ user, date, shifts, leaves, holidays, override }: ResolveDayInput): DaySchedule {
  const weekday = weekdayOfKey(date)

  // Base shift: rotation week, else primary shift.
  const rotationId = rotationShiftId(user.shiftCycle, user.cycleStartDate, date)
  const rotationShift = rotationId ? shifts.get(rotationId) ?? null : null
  let shift = rotationShift ?? (user.shiftId ? shifts.get(user.shiftId) ?? null : null)
  let source: DaySource = rotationShift ? 'ROTATION' : shift ? 'PRIMARY' : 'NONE'
  let status: DayStatus = user.weeklyOffDays.includes(weekday) ? 'OFF' : 'WORK'
  let startTime = shift?.startTime ?? null
  let endTime = shift?.endTime ?? null

  // Roster override beats rotation, primary shift and the weekly day off.
  if (override) {
    if (override.isDayOff) {
      status = 'OFF'
      source = 'OVERRIDE'
    } else {
      const overrideShift = override.shiftId ? shifts.get(override.shiftId) ?? null : null
      if (overrideShift || override.customStart || override.customEnd) {
        if (overrideShift) shift = overrideShift
        status = 'WORK'
        source = 'OVERRIDE'
        startTime = override.customStart ?? shift?.startTime ?? null
        endTime = override.customEnd ?? shift?.endTime ?? null
      }
    }
  }

  // Holidays beat everything above.
  const todays = holidays.filter((h) => wibDateKey(h.date) === date && holidayAppliesTo(h, user))
  const holiday = todays.find((h) => !h.isRainyDay) ?? null
  const isRainyDay = todays.some((h) => h.isRainyDay)
  if (holiday) {
    status = 'HOLIDAY'
    source = 'HOLIDAY'
  }

  const mine = leaves.filter((l) => l.userId === user.id && leaveCovers(l, date))
  const fullLeave = mine.find((l) => (FULL_DAY_LEAVE_TYPES as readonly string[]).includes(l.type)) ?? null
  const halfLeave = mine.find((l) => l.type === 'HALF_DAY') ?? null

  let leave: ScheduleLeave | null = null
  let isHalfDay = false
  if (status === 'WORK' && fullLeave) {
    status = 'LEAVE'
    source = 'LEAVE'
    leave = fullLeave
  } else if (status === 'WORK') {
    // A roster override sets its own hours, so the weekly half day does not apply.
    if (source !== 'OVERRIDE' && user.halfDays.includes(weekday) && endTime) {
      endTime = DEFAULT_HALF_DAY_END
      isHalfDay = true
    }
    if (halfLeave?.halfDayTime) {
      if (halfLeave.halfDayType === 'LATE_IN') startTime = halfLeave.halfDayTime
      if (halfLeave.halfDayType === 'EARLY_OUT') endTime = halfLeave.halfDayTime
      leave = halfLeave
      isHalfDay = true
    }
  }

  return {
    userId: user.id,
    date,
    status,
    source,
    shift,
    startTime,
    endTime,
    leave,
    holiday: holiday ? { id: holiday.id, name: holiday.name } : null,
    isRainyDay,
    isHalfDay,
  }
}

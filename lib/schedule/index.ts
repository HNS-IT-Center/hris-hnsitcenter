import 'server-only'

import { prisma } from '@/lib/prisma'
import { addDaysToKey, dateKeyRange, dateKeyToStoredDay, wibDateKey } from '@/lib/utils/date'
import { toNumberArray, toStringArray } from '@/lib/utils/json-array'
import {
  FULL_DAY_LEAVE_TYPES,
  resolveDay,
  type DaySchedule,
  type ScheduleHoliday,
  type ScheduleLeave,
  type ScheduleOverride,
  type ScheduleShift,
  type ScheduleUser,
} from './resolve'

export * from './resolve'

/** A WIB day: "YYYY-MM-DD", or a Date in either form accepted by wibDateKey(). */
export type DayInput = string | Date

/** Longest range one call may load; a payroll period is about 31 days. */
const MAX_RANGE_DAYS = 400

function toKey(day: DayInput): string {
  return typeof day === 'string' ? day.slice(0, 10) : wibDateKey(day)
}

/**
 * Schedules of many employees over a range of WIB days, with five queries in
 * total (users, shifts, leaves, holidays, overrides) whatever the size.
 * Result: userId -> (YYYY-MM-DD -> DaySchedule). Unknown user ids are left out.
 *
 * No auth check: callers are server actions and cron routes that check first.
 */
export async function getScheduleForRange(
  userIds: readonly string[],
  from: DayInput,
  to: DayInput,
): Promise<Map<string, Map<string, DaySchedule>>> {
  const fromKey = toKey(from)
  const toKeyStr = toKey(to)
  const days = dateKeyRange(fromKey, toKeyStr)
  const result = new Map<string, Map<string, DaySchedule>>()
  if (userIds.length === 0 || days.length === 0) return result
  if (days.length > MAX_RANGE_DAYS) throw new Error(`Schedule range too long: ${days.length} days`)

  const ids = [...new Set(userIds)]
  // Leaves and overrides may hold either form of day (see wibDateKey), so
  // query one day wider on each side and match by WIB day in memory.
  const wideFrom = dateKeyToStoredDay(addDaysToKey(fromKey, -1))
  const wideTo = dateKeyToStoredDay(addDaysToKey(toKeyStr, 1))

  const [users, shifts, leaves, holidays, overrides] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        shiftId: true,
        weeklyOffDays: true,
        halfDays: true,
        shiftCycle: true,
        cycleStartDate: true,
        storeId: true,
        departmentId: true,
        departmentName: true,
      },
    }),
    prisma.shift.findMany({
      select: { id: true, name: true, startTime: true, endTime: true, checkinWindowMin: true, checkinWindowEndMin: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId: { in: ids },
        status: 'APPROVED',
        type: { in: [...FULL_DAY_LEAVE_TYPES, 'HALF_DAY'] },
        startDate: { lte: wideTo },
        endDate: { gte: wideFrom },
      },
      select: {
        id: true,
        userId: true,
        type: true,
        startDate: true,
        endDate: true,
        halfDayType: true,
        halfDayTime: true,
        isPaid: true,
      },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: dateKeyToStoredDay(fromKey), lte: dateKeyToStoredDay(toKeyStr) } },
      include: { department: { select: { name: true } } },
    }),
    prisma.shiftOverride.findMany({
      where: { userId: { in: ids }, date: { gte: wideFrom, lte: wideTo } },
      select: { id: true, userId: true, date: true, shiftId: true, isDayOff: true, customStart: true, customEnd: true },
    }),
  ])

  const shiftMap = new Map<string, ScheduleShift>(shifts.map((s) => [s.id, s]))
  const holidayRows: ScheduleHoliday[] = holidays.map((h) => ({
    id: h.id,
    date: h.date,
    name: h.name,
    scope: h.scope,
    storeId: h.storeId,
    departmentId: h.departmentId,
    departmentName: h.department?.name ?? null,
    isRainyDay: h.isRainyDay,
  }))

  const leavesByUser = new Map<string, ScheduleLeave[]>()
  for (const l of leaves) {
    const list = leavesByUser.get(l.userId) ?? []
    list.push(l)
    leavesByUser.set(l.userId, list)
  }
  const overrideByUserDay = new Map<string, ScheduleOverride>()
  for (const o of overrides) overrideByUserDay.set(`${o.userId}|${wibDateKey(o.date)}`, o)

  for (const u of users) {
    const user: ScheduleUser = {
      id: u.id,
      shiftId: u.shiftId,
      weeklyOffDays: toNumberArray(u.weeklyOffDays),
      halfDays: toNumberArray(u.halfDays),
      shiftCycle: toStringArray(u.shiftCycle),
      cycleStartDate: u.cycleStartDate,
      storeId: u.storeId,
      departmentId: u.departmentId,
      departmentName: u.departmentName,
    }
    const userLeaves = leavesByUser.get(u.id) ?? []
    const perDay = new Map<string, DaySchedule>()
    for (const date of days) {
      perDay.set(
        date,
        resolveDay({
          user,
          date,
          shifts: shiftMap,
          leaves: userLeaves,
          holidays: holidayRows,
          override: overrideByUserDay.get(`${u.id}|${date}`) ?? null,
        }),
      )
    }
    result.set(u.id, perDay)
  }
  return result
}

/** One employee's schedule for one WIB day (default: today), or null if the user does not exist. */
export async function getScheduleForDay(userId: string, day: DayInput = new Date()): Promise<DaySchedule | null> {
  const key = toKey(day)
  const schedules = await getScheduleForRange([userId], key, key)
  return schedules.get(userId)?.get(key) ?? null
}

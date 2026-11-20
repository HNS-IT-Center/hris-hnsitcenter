// No 'server-only' here: scripts/backfill-holidays.ts (tsx) imports this file.
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * The Holiday table is the only source of holidays and rainy days.
 * The HRD calendar writes it: an event of type "holiday" or "rainy" gets one
 * Holiday row (same transaction), and deleting the event deletes the row
 * (FK cascade). Every module reads it through lib/schedule.
 */

/** Calendar event types that write a Holiday row. */
export const HOLIDAY_EVENT_TYPES = ['holiday', 'rainy'] as const

/**
 * Audiences a holiday can have. A day off for one shift or one person is a
 * roster override (ShiftOverride.isDayOff), not a holiday.
 */
export const HOLIDAY_EVENT_SCOPES = ['all', 'store', 'department'] as const

export function isHolidayEventType(type: string): boolean {
  return (HOLIDAY_EVENT_TYPES as readonly string[]).includes(type)
}

export function isHolidayEventScope(scope: string): boolean {
  return (HOLIDAY_EVENT_SCOPES as readonly string[]).includes(scope)
}

type Db = Prisma.TransactionClient | typeof prisma

type CalendarEventLike = {
  id: string
  date: Date
  title: string
  type: string
  scope: string
  scopeValue: string | null
}

/**
 * Builds the Holiday row for a calendar event. The calendar stores store and
 * department *names* in scopeValue; ids are accepted too (older events).
 * Returns an error message instead of throwing so callers can show it.
 */
export async function holidayFromCalendarEvent(
  db: Db,
  event: CalendarEventLike,
): Promise<{ data: Prisma.HolidayUncheckedCreateInput } | { error: string }> {
  if (!isHolidayEventType(event.type)) return { error: `Jenis event ${event.type} bukan hari libur.` }
  const base = {
    date: event.date,
    name: event.title,
    isRainyDay: event.type === 'rainy',
    calendarEventId: event.id,
  }
  const value = event.scopeValue?.trim() ?? ''

  switch (event.scope) {
    case 'all':
      return { data: { ...base, scope: 'ALL' } }
    case 'store': {
      const store = value
        ? await db.store.findFirst({ where: { OR: [{ name: value }, { id: value }] }, select: { id: true } })
        : null
      if (!store) return { error: `Toko "${value}" tidak ditemukan.` }
      return { data: { ...base, scope: 'STORE', storeId: store.id } }
    }
    case 'department': {
      if (!value) return { error: 'Departemen wajib dipilih.' }
      const existing = await db.department.findFirst({
        where: { OR: [{ name: value }, { id: value }] },
        select: { id: true },
      })
      // Department names come from SSO and may not have a row yet (same as updateEmployee).
      const department = existing ?? (await db.department.create({ data: { name: value }, select: { id: true } }))
      return { data: { ...base, scope: 'DEPARTMENT', departmentId: department.id } }
    }
    default:
      return { error: 'Hari libur dan hari hujan hanya bisa untuk semua karyawan, satu toko atau satu departemen.' }
  }
}

/**
 * Holidays (not rainy days) that apply to one employee, for the leave form's
 * day count preview. The server recounts with lib/schedule on submit.
 */
export async function getHolidayDatesForUser(userId: string, from: Date, to: Date): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { storeId: true, departmentId: true, departmentName: true },
  })
  if (!user) return []
  const rows = await prisma.holiday.findMany({
    where: {
      isRainyDay: false,
      date: { gte: from, lte: to },
      OR: [
        { scope: 'ALL' },
        ...(user.storeId ? [{ scope: 'STORE', storeId: user.storeId }] : []),
        ...(user.departmentId ? [{ scope: 'DEPARTMENT', departmentId: user.departmentId }] : []),
        ...(user.departmentName ? [{ scope: 'DEPARTMENT', department: { name: user.departmentName } }] : []),
      ],
    },
    select: { date: true },
  })
  return rows.map((r) => r.date.toISOString())
}

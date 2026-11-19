import 'server-only'

import { prisma } from '@/lib/prisma'

/**
 * Resolve a CalendarEvent audience to active user ids.
 *
 * The HRD Calendar Manager stores department/shift/store *names* in
 * scopeValue, and a comma-separated list of user ids for "individual".
 * Ids are accepted as well, for events stored by older code.
 */
export async function resolveCalendarAudience(scope: string, scopeValue: string | null | undefined): Promise<string[]> {
  const value = scopeValue?.trim() ?? ''
  const active = { isActive: true }

  if (scope === 'all') {
    return (await prisma.user.findMany({ where: active, select: { id: true } })).map((u) => u.id)
  }
  if (!value) return []

  let where
  switch (scope) {
    case 'department':
      where = { ...active, OR: [{ departmentName: value }, { department: { name: value } }, { departmentId: value }] }
      break
    case 'shift':
      where = { ...active, OR: [{ shift: { name: value } }, { shiftId: value }] }
      break
    case 'store':
      where = { ...active, OR: [{ store: { name: value } }, { storeId: value }] }
      break
    case 'individual':
      where = { ...active, id: { in: value.split(',').map((v) => v.trim()).filter(Boolean) } }
      break
    default:
      return []
  }
  return (await prisma.user.findMany({ where, select: { id: true } })).map((u) => u.id)
}

/**
 * Calendar filter for one employee: the events whose audience includes them.
 * Matches both the names the Calendar Manager stores and ids.
 */
export function calendarEventsForUser(user: {
  id: string
  departmentId: string | null
  departmentName: string | null
  shiftId: string | null
  shiftName: string | null
  storeId: string | null
  storeName: string | null
}) {
  const anyOf = (scope: string, values: (string | null)[]) =>
    values.filter((v): v is string => !!v).map((scopeValue) => ({ scope, scopeValue }))

  return [
    { scope: 'all' },
    ...anyOf('department', [user.departmentName, user.departmentId]),
    ...anyOf('shift', [user.shiftName, user.shiftId]),
    ...anyOf('store', [user.storeName, user.storeId]),
    { scope: 'individual', scopeValue: { contains: user.id } },
  ]
}

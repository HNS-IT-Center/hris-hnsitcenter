import { PerformancePage } from "@/components/hris/pages/performance"
import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPayrollPeriod } from "@/lib/utils/date"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const ssoUser = await getServerUser()
  const dbUser = await prisma.user.findUnique({
    where: { email: ssoUser.email },
    select: { id: true, departmentId: true, storeId: true, shiftId: true, weeklyOffDays: true },
  })
  if (!dbUser) return null

  const now = new Date()
  const year = parseInt(params.year ?? String(now.getFullYear()))
  const month = parseInt(params.month ?? String(now.getMonth() + 1))

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1))
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59))

  const baseDate = new Date(Date.UTC(year, month - 1, 15))
  const { startDateUTC, endDateUTC, periodLabel } = getPayrollPeriod(baseDate)

  const minDate = new Date(Math.min(startOfMonth.getTime(), startDateUTC.getTime()))
  const maxDate = new Date(Math.max(endOfMonth.getTime(), endDateUTC.getTime()))

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      userId: dbUser.id,
      date: { gte: minDate, lte: maxDate },
    },
    select: { date: true, status: true, lateMinutes: true },
    orderBy: { date: "asc" },
  })

  // Precompute summary for the payroll period
  let hadir = 0, telat = 0, alpha = 0, izin = 0, cuti = 0
  for (const r of attendanceRecords) {
    if (r.date >= startDateUTC && r.date <= endDateUTC) {
      if (r.status === 'PRESENT') hadir++
      if (r.status === 'LATE') telat++
      if (r.status === 'ALPHA') alpha++
      if (r.status === 'ON_LEAVE') izin++
    }
  }

  // Fetch events. Filter by the user's scope so they don't see events meant for others.
  const [events, leaves] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        OR: [
          { scope: 'all' },
          ...(dbUser.departmentId ? [{ scope: 'department', scopeValue: dbUser.departmentId }] : []),
          ...(dbUser.shiftId ? [{ scope: 'shift', scopeValue: dbUser.shiftId }] : []),
          ...(dbUser.storeId ? [{ scope: 'store', scopeValue: dbUser.storeId }] : []),
          { scope: 'individual', scopeValue: { contains: dbUser.id } }
        ]
      }
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId: dbUser.id,
        status: 'APPROVED',
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth }
      }
    })
  ])

  // Convert LeaveRequests into pseudo CalendarEvents
  const leaveEvents = leaves.flatMap(leave => {
    // Generate an event for each day of the leave
    const days = []
    let curr = new Date(leave.startDate)
    // Make sure we only generate events within this month's bounds
    const end = new Date(leave.endDate)
    while (curr <= end) {
      if (curr >= startOfMonth && curr <= endOfMonth) {
        days.push({
          id: `leave-${leave.id}-${curr.toISOString()}`,
          date: curr.toISOString().split('T')[0],
          title: `Izin/Cuti: ${leave.type}`,
          type: 'ON_LEAVE',
          scope: 'individual',
          note: leave.reason
        })
      }
      curr.setDate(curr.getDate() + 1)
    }
    return days
  })

  // We can pass combined events to PerformancePage
  const combinedEvents = [...events.map(e => ({
    id: e.id,
    title: e.title,
    type: e.type,
    scope: e.scope,
    note: e.note,
    date: e.date.toISOString().split('T')[0]
  })), ...leaveEvents]

  return (
    <PerformancePage 
      attendanceRecords={attendanceRecords
        .filter(r => r.date >= startOfMonth && r.date <= endOfMonth)
        .map(r => ({ ...r, date: r.date.toISOString() }))} 
      events={combinedEvents} 
      year={year} 
      month={month} 
      summary={{ hadir, telat, alpha, izin, cuti }}
      periodLabel={periodLabel}
      weeklyOffDays={dbUser.weeklyOffDays}
    />
  )
}

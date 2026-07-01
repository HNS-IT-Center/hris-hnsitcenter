import { PerformancePage } from "@/components/hris/pages/performance"
import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const ssoUser = await getServerUser()
  const dbUser = await prisma.user.findUnique({
    where: { email: ssoUser.email },
    select: { id: true },
  })
  if (!dbUser) return null

  const now = new Date()
  const year = parseInt(params.year ?? String(now.getFullYear()))
  const month = parseInt(params.month ?? String(now.getMonth() + 1))

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1))
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59))

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      userId: dbUser.id,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    select: { date: true, status: true, lateMinutes: true },
    orderBy: { date: "asc" },
  })

  // Fetch events. Normally we'd filter by scope, but let's grab all for the month to filter on the client.
  const [events, leaves] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
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
    ...e,
    date: e.date.toISOString().split('T')[0]
  })), ...leaveEvents]

  return <PerformancePage attendanceRecords={attendanceRecords} events={combinedEvents} year={year} month={month} />
}

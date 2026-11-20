import { LeavePage } from "@/components/hris/pages/leave"
import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toNumberArray } from "@/lib/utils/json-array"
import { getMyLeaveRequests, getMyLeaveQuota } from "@/app/actions/leave"
import { getMyOvertimeRequests } from "@/app/actions/overtime"
import { getHolidayDatesForUser } from "@/lib/holidays"
import { todayUTC } from "@/lib/utils/date"

export default async function Page() {
  const ssoUser = await getServerUser()
  const dbUser = await prisma.user.findUnique({
    where: { email: ssoUser.email },
    select: { id: true, weeklyOffDays: true },
  })
  if (!dbUser) return null

  // Holidays for the leave form's day count preview: from 60 days back to a year ahead.
  const today = todayUTC()
  const [leaveRequests, overtimeRequests, leaveQuota, holidays] = await Promise.all([
    getMyLeaveRequests(dbUser.id),
    getMyOvertimeRequests(),
    getMyLeaveQuota(dbUser.id),
    getHolidayDatesForUser(dbUser.id, new Date(today.getTime() - 60 * 86400000), new Date(today.getTime() + 366 * 86400000)),
  ])

  const combinedRequests = [
    ...leaveRequests,
    ...overtimeRequests.map(o => ({
      id: o.id,
      userId: o.userId,
      type: "OVERTIME",
      startDate: o.overtimeDate,
      endDate: o.overtimeDate,
      startTime: o.startTime,
      endTime: o.endTime,
      totalDays: 0,
      totalHours: o.totalHours,
      reason: o.task,
      status: o.status,
      rejectReason: o.rejectReason,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      isPaid: false,
      sickNoteUrl: null
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as any[]

  return (
    <LeavePage
      role="employee"
      userId={dbUser.id}
      leaveRequests={combinedRequests}
      leaveQuota={leaveQuota}
      weeklyOffDays={toNumberArray(dbUser.weeklyOffDays)}
      holidays={holidays}
    />
  )
}

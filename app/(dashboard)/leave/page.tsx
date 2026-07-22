import { LeavePage } from "@/components/hris/pages/leave"
import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMyLeaveRequests, getMyLeaveQuota } from "@/app/actions/leave"
import { getMyOvertimeRequests } from "@/app/actions/overtime"

export default async function Page() {
  const ssoUser = await getServerUser()
  const dbUser = await prisma.user.findUnique({
    where: { email: ssoUser.email },
    select: { id: true, weeklyOffDays: true },
  })
  if (!dbUser) return null

  const [leaveRequests, overtimeRequests, leaveQuota, holidayAssignments] = await Promise.all([
    getMyLeaveRequests(dbUser.id),
    getMyOvertimeRequests(),
    getMyLeaveQuota(dbUser.id),
    prisma.holidayAssignment.findMany({
      where: {
        OR: [
          { applyToAll: true },
          { userId: dbUser.id }
        ]
      },
      include: { holidayMarker: true }
    })
  ])

  const holidays = holidayAssignments.map(ha => ha.holidayMarker.date.toISOString())

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
      weeklyOffDays={dbUser.weeklyOffDays}
      holidays={holidays}
    />
  )
}

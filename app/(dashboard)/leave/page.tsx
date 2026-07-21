import { LeavePage } from "@/components/hris/pages/leave"
import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMyLeaveRequests, getMyLeaveQuota } from "@/app/actions/leave"

export default async function Page() {
  const ssoUser = await getServerUser()
  const dbUser = await prisma.user.findUnique({
    where: { email: ssoUser.email },
    select: { id: true, weeklyOffDays: true },
  })
  if (!dbUser) return null

  const [leaveRequests, leaveQuota, holidayAssignments] = await Promise.all([
    getMyLeaveRequests(dbUser.id),
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

  return (
    <LeavePage
      role="employee"
      userId={dbUser.id}
      leaveRequests={leaveRequests}
      leaveQuota={leaveQuota}
      weeklyOffDays={dbUser.weeklyOffDays}
      holidays={holidays}
    />
  )
}

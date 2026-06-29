import { LeavePage } from "@/components/hris/pages/leave"
import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMyLeaveRequests, getMyLeaveQuota } from "@/app/actions/leave"

export default async function Page() {
  const ssoUser = await getServerUser()
  const dbUser = await prisma.user.findUnique({
    where: { ssoId: ssoUser.id },
    select: { id: true },
  })
  if (!dbUser) return null

  const [leaveRequests, leaveQuota] = await Promise.all([
    getMyLeaveRequests(dbUser.id),
    getMyLeaveQuota(dbUser.id),
  ])

  return (
    <LeavePage
      role="employee"
      userId={dbUser.id}
      leaveRequests={leaveRequests}
      leaveQuota={leaveQuota}
    />
  )
}

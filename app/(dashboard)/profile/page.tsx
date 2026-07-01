import { ProfilePage } from "@/components/hris/pages/profile"
import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMyLeaveQuota } from "@/app/actions/leave"

export default async function Page() {
  const ssoUser = await getServerUser()
  const dbUser = await prisma.user.findUnique({
    where: { ssoId: ssoUser.id },
    include: {
      store: { select: { name: true } },
      shift: { select: { name: true } },
      department: { select: { name: true } },
    },
  })
  if (!dbUser) return null

  const leaveQuota = await getMyLeaveQuota(dbUser.id)
  const hasPassword = !!dbUser.passwordHash

  return <ProfilePage user={dbUser as any} leaveQuota={leaveQuota} hasPassword={hasPassword} />
}

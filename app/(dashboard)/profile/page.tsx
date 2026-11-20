import { ProfilePage } from "@/components/hris/pages/profile"
import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMyLeaveQuota } from "@/app/actions/leave"
import { getEmployeePayrollSlips } from "@/app/actions/payroll"

export default async function Page() {
  const ssoUser = await getServerUser()
  const dbUser = await prisma.user.findUnique({
    where: { email: ssoUser.email },
    include: {
      store: { select: { name: true } },
      shift: { select: { name: true } },
      department: { select: { name: true } },
    },
  })
  if (!dbUser) return null

  const [leaveQuota, payrollSlips] = await Promise.all([
    getMyLeaveQuota(dbUser.id),
    getEmployeePayrollSlips(dbUser.id),
  ])
  // Password, 2FA and passkeys live in the HNS SSO.
  const ssoAccountUrl = process.env.SSO_ISSUER ?? null

  return <ProfilePage user={dbUser as any} leaveQuota={leaveQuota} ssoAccountUrl={ssoAccountUrl} payrollSlips={payrollSlips as any} />
}


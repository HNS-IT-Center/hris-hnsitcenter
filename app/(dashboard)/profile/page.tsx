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
  const hasPassword = !!dbUser.passwordHash

  return <ProfilePage user={dbUser as any} leaveQuota={leaveQuota} hasPassword={hasPassword} payrollSlips={payrollSlips as any} />
}


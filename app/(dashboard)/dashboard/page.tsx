import { EmployeeDashboard } from "@/components/hris/pages/employee-dashboard"
import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEmployeeDashboardData } from "@/app/actions/dashboard"

export default async function DashboardPage() {
  const ssoUser = await getServerUser()

  // Resolve the real DB user from ssoId
  const dbUser = await prisma.user.findUnique({
    where: { ssoId: ssoUser.id },
    select: { id: true },
  })

  if (!dbUser) {
    return (
      <div className="mx-auto max-w-xl text-center space-y-4 pt-10">
        <h2 className="text-2xl font-bold text-destructive">Akun Belum Terdaftar</h2>
        <p className="text-muted-foreground">Akun Anda belum ada di database HRIS. Silakan hubungi HRD.</p>
      </div>
    )
  }

  const data = await getEmployeeDashboardData(dbUser.id)

  return <EmployeeDashboard data={data} />
}

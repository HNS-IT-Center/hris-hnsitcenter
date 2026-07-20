import { getAllEmployeesPayrollSummary } from "@/app/actions/payroll"
import { PayrollManagement } from "@/components/hris/pages/payroll-management"
import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getPayrollPeriodByMonth } from "@/lib/utils/date"

export const metadata = {
  title: "Manajemen Payroll | HNS IT Center HRIS",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const ssoUser = await getServerUser()
  const dbUser = await prisma.user.findUnique({ where: { email: ssoUser.email } })
  if (!dbUser || (dbUser.role !== "HRD" && dbUser.role !== "BOSS" && dbUser.role !== "ADMIN")) {
    redirect("/dashboard")
  }

  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1

  const { periodStart, periodEnd } = getPayrollPeriodByMonth(year, month)

  // Pass year & month so the summary query can check the current-period slip status
  const employees = await getAllEmployeesPayrollSummary(year, month)

  return (
    <PayrollManagement
      employees={employees as any}
      periodStart={periodStart.toISOString()}
      periodEnd={periodEnd.toISOString()}
      currentYear={year}
      currentMonth={month}
    />
  )
}

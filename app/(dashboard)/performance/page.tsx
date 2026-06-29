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
    where: { ssoId: ssoUser.id },
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

  return <PerformancePage attendanceRecords={attendanceRecords} year={year} month={month} />
}

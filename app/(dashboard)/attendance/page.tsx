import { AttendancePage } from "@/components/hris/pages/attendance"
import { prisma } from "@/lib/prisma"
import { getTodayAttendance } from "@/app/actions/attendance"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function Page() {
  const headersList = await headers()
  const userId = headersList.get("x-user-id")
  
  if (!userId) {
    redirect("/login")
  }

  // Fetch full user and store
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { store: true }
  })

  if (!user) return null

  // Fetch today's attendance record
  const todayRecord = await getTodayAttendance(user.id)

  return (
    <AttendancePage 
      user={user}
      store={user.store}
      todayRecord={todayRecord}
    />
  )
}

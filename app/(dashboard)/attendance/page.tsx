import { AttendancePage } from "@/components/hris/pages/attendance"
import { getSession } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getTodayAttendance } from "@/app/actions/attendance"

export default async function Page() {
  const session = await getSession()
  if (!session) return null

  // Fetch full user and store
  const user = await prisma.user.findUnique({
    where: { id: session.id },
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

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
    where: { ssoId: userId },
    include: { store: true }
  })

  if (!user) {
    return (
      <div className="mx-auto max-w-xl text-center space-y-4 pt-10">
        <h2 className="text-2xl font-bold text-destructive">Akses Ditolak</h2>
        <p className="text-muted-foreground">Akun Anda belum terdaftar di database HRIS. Silakan hubungi HRD.</p>
      </div>
    )
  }

  if (!user.store) {
    return (
      <div className="mx-auto max-w-xl text-center space-y-4 pt-10">
        <h2 className="text-2xl font-bold text-destructive">Toko Belum Diatur</h2>
        <p className="text-muted-foreground">Anda belum ditugaskan ke lokasi/toko manapun. Silakan hubungi HRD untuk pengaturan lokasi absensi Anda.</p>
      </div>
    )
  }

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

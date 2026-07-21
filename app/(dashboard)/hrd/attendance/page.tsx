import { HrdAttendanceLogs } from "@/components/hris/pages/hrd-attendance-logs"
import { getHrdAttendanceLogs } from "@/app/actions/dashboard"
import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const data = await getHrdAttendanceLogs(params.date)
  
  const user = await getServerUser()
  let hrdStoreCoords = undefined
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { store: true }
    })
    if (dbUser?.store) {
      hrdStoreCoords = { lat: dbUser.store.latitude, lng: dbUser.store.longitude, name: dbUser.store.name }
    }
  }

  return <HrdAttendanceLogs initialData={data} hrdStoreCoords={hrdStoreCoords} />
}

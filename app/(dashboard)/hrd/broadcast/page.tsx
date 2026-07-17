import { BroadcastPage } from "@/components/hris/pages/broadcast"
import { prisma } from "@/lib/prisma"
import { getBroadcasts } from "@/app/actions/broadcast"

export default async function Page() {
  const [departments, stores, shifts, users, broadcasts] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.store.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.shift.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, departmentName: true, positionName: true },
      orderBy: { name: 'asc' },
    }),
    getBroadcasts(),
  ])

  return (
    <BroadcastPage
      departments={departments}
      stores={stores}
      shifts={shifts}
      users={users}
      broadcasts={broadcasts}
    />
  )
}

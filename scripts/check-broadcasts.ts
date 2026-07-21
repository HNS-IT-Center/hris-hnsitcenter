import { config } from 'dotenv'
config()
import { prisma } from '../lib/prisma'

async function run() {
  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      filterDepts: true,
      filterStores: true,
      filterShifts: true,
      filterUsers: true,
    }
  })
  console.dir(broadcasts, { depth: null })

  const user = await prisma.user.findFirst({
    where: { role: 'EMPLOYEE' },
    select: { id: true, name: true, departmentId: true, department: true }
  })
  console.log("Sample Employee:", user)
}
run()

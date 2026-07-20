import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { format } from 'date-fns'

async function main() {
  console.log('Fetching all users...')
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Found ${users.length} users. Backfilling employeeId...`)
  
  let currentNum = 1
  for (const user of users) {
    if (!user.employeeId) {
      const newId = `HNS-${String(currentNum).padStart(4, '0')}`
      await prisma.user.update({
        where: { id: user.id },
        data: { employeeId: newId },
      })
      console.log(`Updated user ${user.email} with ID ${newId}`)
      currentNum++
    }
  }

  console.log('Fetching all payroll slips to generate slugs...')
  const slips = await prisma.payrollSlip.findMany({
    include: { user: true },
  })

  let updatedSlips = 0
  for (const slip of slips) {
    if (!slip.slug && slip.user.employeeId) {
      const periodName = format(new Date(slip.periodEnd), 'MMM-yyyy').toLowerCase() // e.g. jul-2026
      const newSlug = `${slip.user.employeeId}-${periodName}`.toLowerCase()
      
      try {
        await prisma.payrollSlip.update({
          where: { id: slip.id },
          data: { slug: newSlug },
        })
        updatedSlips++
      } catch (err) {
        console.error(`Error updating slug for slip ${slip.id}:`, err)
      }
    }
  }

  console.log(`Updated ${updatedSlips} payroll slips with slugs.`)
  console.log('Backfill complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { _generatePayrollSlipInternal } from '../app/actions/payroll'

async function main() {
  console.log('🔄 Generating old slips for past months...')
  
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1
  
  // We want to generate for month - 1 and month - 2
  const targetPeriods = []
  
  let m1 = month - 1
  let y1 = year
  if (m1 < 1) { m1 = 12; y1-- }
  targetPeriods.push({ year: y1, month: m1 })
  
  let m2 = m1 - 1
  let y2 = y1
  if (m2 < 1) { m2 = 12; y2-- }
  targetPeriods.push({ year: y2, month: m2 })
  
  const employees = await prisma.user.findMany({
    where: { isActive: true, role: { not: 'BOSS' } },
    select: { id: true, name: true }
  })
  
  console.log(`Found ${employees.length} employees. Starting generation...`)
  
  for (const { year, month } of targetPeriods) {
    console.log(`\n📅 Generating for period: ${year}-${month}`)
    let successCount = 0
    let failCount = 0
    
    for (const emp of employees) {
      try {
        const res = await _generatePayrollSlipInternal(emp.id, year, month)
        if (res.success) {
          successCount++
        } else {
          failCount++
        }
      } catch (err) {
        console.error(`Failed for emp ${emp.id}:`, err)
        failCount++
      }
    }
    console.log(`✅ Success: ${successCount} | ❌ Failed/Skipped: ${failCount}`)
  }
  
  console.log('\n🎉 Selesai meng-generate slip gaji untuk bulan sebelumnya!')
}

main().catch(console.error).finally(() => prisma.$disconnect())

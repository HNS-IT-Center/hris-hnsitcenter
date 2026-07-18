import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  console.log('🧹 Memulai proses penghapusan data dummy...')
  
  // 1. Get dummy users
  const dummyUsers = await prisma.user.findMany({
    where: { email: { endsWith: '@dummy.local' } },
    select: { id: true }
  })
  const userIds = dummyUsers.map(u => u.id)

  if (userIds.length > 0) {
    await prisma.attendance.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.leaveRequest.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.leaveQuota.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.overtimeRequest.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.userDevice.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.userPayrollConfig.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.payrollSlip.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.appNotification.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.attentionFlag.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.performanceMonthly.deleteMany({ where: { userId: { in: userIds } } })

    const result = await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    })
    console.log(`✅ Berhasil menghapus ${result.count} karyawan dummy beserta seluruh riwayat absensi dan izin mereka!`)
  } else {
    console.log('✅ Tidak ada data dummy yang perlu dihapus.')
  }

  console.log('✅ Proses penghapusan data dummy selesai.')
  console.log('Data SSO asli (admin@hnsitcenter.id dll) aman dan tidak tersentuh.')
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat menghapus data dummy:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

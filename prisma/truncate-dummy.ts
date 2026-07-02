import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  console.log('🧹 Memulai proses penghapusan data dummy...')
  
  // Hapus semua user yang email-nya berakhiran @dummy.local
  // Cascading delete di Prisma akan secara otomatis menghapus:
  // - Attendance
  // - LeaveRequest
  // - AppNotification
  // - UserDevice
  // - Dan relasi lainnya yang mengarah ke User ini
  const result = await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: '@dummy.local'
      }
    }
  })

  console.log(`✅ Berhasil menghapus ${result.count} karyawan dummy beserta seluruh riwayat absensi dan izin mereka!`)
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

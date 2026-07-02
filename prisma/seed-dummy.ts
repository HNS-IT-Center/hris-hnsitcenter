import 'dotenv/config'
import { UserRole, Shift, Store, Department } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { addDays, format, isWeekend, parseISO, startOfDay, endOfDay } from 'date-fns'

async function main() {
  console.log('🌱 Memulai proses seeding massive dummy data...')
  
  // 1. Ambil data dasar (Pastikan prisma/seed.ts sudah pernah dijalankan)
  const stores = await prisma.store.findMany()
  const shifts = await prisma.shift.findMany()
  const depts = await prisma.department.findMany()

  if (stores.length === 0 || shifts.length === 0 || depts.length === 0) {
    console.error('❌ Data dasar (Store/Shift/Department) belum ada. Jalankan "npx tsx prisma/seed.ts" terlebih dahulu.')
    process.exit(1)
  }

  // 2. Bersihkan dummy lama jika ada untuk mencegah duplikasi
  console.log('🧹 Membersihkan sisa data dummy lama...')
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@dummy.local' } }
  })

  // 3. Buat 30 Karyawan Dummy
  console.log('👥 Membuat 30 karyawan dummy...')
  const dummyUsers = []
  
  const firstNames = ['Budi', 'Siti', 'Andi', 'Dewi', 'Joko', 'Ayu', 'Eko', 'Rini', 'Agus', 'Nina', 'Hendra', 'Maya', 'Iwan', 'Lestari', 'Rudi', 'Ratna', 'Yudi', 'Sari', 'Dedi', 'Rina', 'Arief', 'Lia', 'Fajar', 'Tari', 'Dian', 'Fitri', 'Reza', 'Nita', 'Wahyu', 'Putri']
  const lastNames = ['Santoso', 'Wijaya', 'Kusuma', 'Pratama', 'Nugroho', 'Setiawan', 'Hidayat', 'Putra', 'Saputra', 'Wahyudi']

  for (let i = 0; i < 30; i++) {
    const fName = firstNames[i % firstNames.length]
    const lName = lastNames[i % lastNames.length]
    
    // Assign random store, shift, dept
    const store = stores[i % stores.length]
    const shift = shifts[i % shifts.length]
    const dept = depts[i % depts.length]

    const user = await prisma.user.create({
      data: {
        email: `dummy_${i + 1}@dummy.local`,
        name: `${fName} ${lName}`,
        passwordHash: 'Password123!', // Standar password dummy
        role: 'EMPLOYEE',
        phoneNumber: `081234567${i.toString().padStart(3, '0')}`,
        storeId: store.id,
        shiftId: shift.id,
        departmentId: dept.id,
        leaveQuotaRemaining: 12,
      }
    })
    dummyUsers.push(user)
  }

  console.log(`✅ Berhasil membuat ${dummyUsers.length} karyawan dummy.`)

  // 4. Generate Riwayat Absensi (Pertengahan April - Hari ini)
  console.log('📅 Mem-build riwayat absensi (estimasi: 2.5 bulan, ribuan baris)...')
  
  const startDate = parseISO('2026-04-15T00:00:00Z')
  const endDate = new Date('2026-07-02T00:00:00Z') // Tanggal patokan

  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  let countAttendance = 0
  let countLeave = 0

  for (let d = 0; d <= totalDays; d++) {
    const currentDate = addDays(startDate, d)
    
    // Lewati akhir pekan (asumsi libur kerja untuk contoh ini, meski retail mungkin masuk)
    // Untuk retail, kita anggap Senin-Jumat masuk (biar simple simulasi).
    if (isWeekend(currentDate)) continue;

    for (const user of dummyUsers) {
      // 10% chance karyawan ini sedang izin/cuti
      const isLeave = Math.random() < 0.1
      
      if (isLeave) {
        // Buat Leave Request
        const type = Math.random() > 0.5 ? 'PERSONAL' : 'ANNUAL_LEAVE'
        await prisma.leaveRequest.create({
          data: {
            userId: user.id,
            type,
            startDate: currentDate,
            endDate: currentDate,
            reason: 'Keperluan simulasi seeder',
            status: 'APPROVED',
          }
        })
        countLeave++
        continue;
      }

      // Jika tidak izin, kemungkinan masuk kerja
      // 90% masuk, 10% Alpha (Belum Absen sama sekali)
      if (Math.random() < 0.1) continue;

      // Dari yang masuk, 15% telat
      const isLate = Math.random() < 0.15
      
      // Ambil jam masuk shift
      const shift = shifts.find(s => s.id === user.shiftId)
      if (!shift) continue;

      const [startHour, startMin] = shift.startTime.split(':').map(Number)
      
      // Simulasi jam check-in
      const checkInDate = new Date(currentDate)
      if (isLate) {
        checkInDate.setHours(startHour, startMin + Math.floor(Math.random() * 45) + 5) // Telat 5 - 50 menit
      } else {
        checkInDate.setHours(startHour, startMin - Math.floor(Math.random() * 20)) // Lebih awal 0-20 menit
      }

      // 5% Lupa Check-out
      const forgotCheckout = Math.random() < 0.05
      let checkOutDate = null
      
      if (!forgotCheckout) {
        const [endHour, endMin] = shift.endTime.split(':').map(Number)
        checkOutDate = new Date(currentDate)
        // 5% Early Leave
        const isEarlyLeave = Math.random() < 0.05
        if (isEarlyLeave) {
          checkOutDate.setHours(endHour, endMin - Math.floor(Math.random() * 60) - 10) // Pulang 10-70 mnt lebih awal
        } else {
          checkOutDate.setHours(endHour, endMin + Math.floor(Math.random() * 30)) // Pulang tepat/telat s.d 30 mnt
        }
      }

      // Insert Attendance
      await prisma.attendance.create({
        data: {
          userId: user.id,
          storeId: user.storeId!,
          date: currentDate,
          checkInTime: checkInDate,
          status: isLate ? 'LATE' : 'PRESENT',
          checkInLat: -6.2088,
          checkInLng: 106.8456,
          checkOutTime: checkOutDate,
          isForgotCheckout: forgotCheckout,
        }
      })
      countAttendance++
    }
  }

  console.log(`✅ Berhasil membuat ${countAttendance} riwayat absensi.`)
  console.log(`✅ Berhasil membuat ${countLeave} riwayat izin/cuti.`)
  console.log('🎉 SEEDING DUMMY MASSAL SELESAI!')
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

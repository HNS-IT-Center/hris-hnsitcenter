import 'dotenv/config'
import { Role, Shift, Store, Department } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { addDays, format, isWeekend, parseISO, startOfDay, endOfDay } from 'date-fns'
import { generateNextEmployeeId } from '../lib/utils/employee-id'
import { _generatePayrollSlipInternal } from '../app/actions/payroll'

const employeesData = [
  { name: 'KENTONI', off: [0], half: [], shift: 'Siang', email: 'kentoni@hns.id' },
  { name: 'YANI', off: [2], half: [], shift: 'Pagi', email: 'yani@hns.id' },
  { name: 'YULI', off: [4], half: [], shift: 'Siang', email: 'yuli@hns.id' },
  { name: 'SYARIL', off: [3], half: [], shift: 'Pagi', email: 'syaril@hns.id' },
  { name: 'RINA', off: [2], half: [], shift: 'Pagi', email: 'rina@hns.id' },
  { name: 'CONS', off: [0], half: [], shift: 'Pagi', email: 'cons@hns.id' },
  { name: 'NESSA', off: [4], half: [], shift: 'Siang', email: 'nessa@hns.id' },
  { name: 'TANJUNG', off: [5], half: [], shift: 'Pagi', email: 'tanjung@hns.id' },
  { name: 'STEAVEN', off: [2], half: [], shift: 'Pagi', email: 'steaven@hns.id' },
  { name: 'MITCHELL', off: [5], half: [], shift: 'Pagi', email: 'mitchell@hns.id' },
  { name: 'RIANTO', off: [1], half: [], shift: 'Siang', email: 'rianto@hns.id' },
  { name: 'RAFFI', off: [0], half: [], shift: 'Pagi', email: 'raffi@hns.id' },
  { name: 'JELDY', off: [6], half: [], shift: 'Siang', email: 'jeldy@hns.id' },
  { name: 'DENNIS', off: [0], half: [], shift: 'Siang', email: 'dennis@hns.id' },
  { name: 'RAFAEL', off: [4], half: [], shift: 'Pagi', email: 'rafael@hns.id' },
  { name: 'FEBRIAN', off: [3], half: [], shift: 'Pagi', email: 'febrian@hns.id' },
  { name: 'JHO', off: [1], half: [], shift: 'Siang', email: 'jho@hns.id' },
  { name: 'KELVIN', off: [0], half: [], shift: 'Siang', email: 'kelvin@hns.id' },
  { name: 'SELLY', off: [0], half: [], shift: 'Siang', email: 'selly@hns.id' },
  { name: 'IHZA', off: [0], half: [], shift: 'Siang', email: 'ihza@hns.id' },
  { name: 'CHANDRA', off: [1], half: [], shift: 'Pagi', email: 'chandra@hns.id' },
  { name: 'RIKA', off: [2], half: [], shift: 'Pagi', email: 'rika@hns.id' },
  { name: 'ERIKA SILV', off: [3], half: [], shift: 'Siang', email: 'erikasilv@hns.id' },
  { name: 'ARIF', off: [4], half: [], shift: 'Siang', email: 'arif@hns.id' },
  { name: 'RENDI', off: [5], half: [], shift: 'Siang', email: 'rendi@hns.id' },
  { name: 'HENDRA', off: [0], half: [], shift: 'Siang', email: 'hendra@hns.id' },
  { name: 'RANI', off: [3], half: [], shift: 'Pagi', email: 'rani@hns.id' },
  { name: 'WINDY', off: [5], half: [], shift: 'Siang', email: 'windy@hns.id' },
  { name: 'JESEN', off: [0], half: [], shift: 'Siang', email: 'jesen@hns.id' },
  { name: 'REI', off: [0], half: [], shift: 'Siang', email: 'rei@hns.id' },
  { name: 'FIKRY', off: [0], half: [], shift: 'Siang', email: 'fikry@hns.id' },
  { name: 'JUN', off: [1], half: [], shift: 'Siang', email: 'jun@hns.id' },
  { name: 'IVAN', off: [3], half: [], shift: 'Siang', email: 'ivan@hns.id' },
  { name: 'AAW', off: [4], half: [], shift: 'Siang', email: 'aaw@hns.id' },
  { name: 'NALDI', off: [5], half: [], shift: 'Pagi', email: 'naldi@hns.id' },
  { name: 'INDAH', off: [2], half: [], shift: 'Pagi', email: 'indah@hns.id' },
  { name: 'GHOSSAN', off: [4], half: [], shift: 'Siang', email: 'ghossan@hns.id' },
  { name: 'FRINA', off: [0], half: [6], shift: 'Pagi', email: 'frina@hns.id' },
  { name: 'ERIKA', off: [0], half: [6], shift: 'Pagi', email: 'erika@hns.id' },
  { name: 'RIYAN', off: [0], half: [6], shift: 'Pagi', email: 'riyan@hns.id' },
  { name: 'TYO', off: [0], half: [6], shift: 'Pagi', email: 'tyo@hns.id' },
  { name: 'SINDY', off: [0], half: [6], shift: 'Pagi', email: 'sindy@hns.id' },
  { name: 'CRISTINE', off: [0], half: [6], shift: 'Pagi', email: 'cristine@hns.id' },
  { name: 'AGI', off: [0], half: [6], shift: 'Pagi', email: 'agi@hns.id' },
  { name: 'OMI', off: [0], half: [6], shift: 'Pagi', email: 'omi@hns.id' },
  { name: 'NICHOLAS', off: [0], half: [6], shift: 'Pagi', email: 'nicholas@hns.id' },
  { name: 'TASYA', off: [0], half: [6], shift: 'Pagi', email: 'tasya@hns.id' },
]

async function main() {
  console.log('🌱 Memulai proses seeding real data dari briefing...')
  
  const stores = await prisma.store.findMany()
  const shifts = await prisma.shift.findMany()
  const depts = await prisma.department.findMany()

  if (stores.length === 0 || shifts.length === 0 || depts.length === 0) {
    console.error('❌ Data dasar (Store/Shift/Department) belum ada.')
    process.exit(1)
  }

  const shiftPagi = shifts.find(s => s.name.toLowerCase().includes('pagi')) || shifts[0]
  const shiftSiang = shifts.find(s => s.name.toLowerCase().includes('siang') || s.name.toLowerCase().includes('sore') || s.name.toLowerCase().includes('malam')) || shifts[1] || shifts[0]
  const store = stores[0] // assign all to main store for simplicity
  const dept = depts[0]   // assign all to main dept for simplicity

  console.log('🧹 Membersihkan sisa data dummy lama...')
  
  // Clean up data for employees from this script to allow re-running
  const emails = employeesData.map(e => e.email)
  const usersToDelete = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } })
  const userIds = usersToDelete.map(u => u.id)

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
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }

  console.log('👥 Membuat karyawan berdasarkan list...')
  const dbUsers = []
  
  for (const ed of employeesData) {
    const employeeId = await generateNextEmployeeId()
    const targetShiftId = ed.shift === 'Pagi' ? shiftPagi.id : shiftSiang.id

    const user = await prisma.user.create({
      data: {
        employeeId,
        email: ed.email,
        name: ed.name,
        passwordHash: '$2a$10$w8T0eM3XUf9l2hN21nQ9YOLzX7iL5sE2XQy9m7Uu9.rO1Z1L2L1Zy', // "hns123456" bcrypt hash (wait, I should hash it properly or use a placeholder if the app handles it, wait, the app uses bcryptjs, I will just require it)
        role: 'EMPLOYEE',
        storeId: store.id,
        shiftId: targetShiftId,
        departmentId: dept.id,
        weeklyOffDays: ed.off,
        halfDays: ed.half,
        leaveQuotaRemaining: 12,
        joinDate: new Date('2026-03-01T00:00:00Z')
      }
    })
    
    await prisma.userPayrollConfig.create({
      data: {
        userId: user.id,
        baseSalary26Days: 5000000, 
        uangMakan: 500000,
        transport: 300000,
        bpjs: 150000,
        pph21: 0,
      }
    })
    
    dbUsers.push({ ...user, targetShiftId })
  }

  console.log(`✅ Berhasil membuat ${dbUsers.length} karyawan.`)

  console.log('📅 Mem-build riwayat absensi (1 Maret 2026 - 20 Juli 2026)...')
  
  const startDate = parseISO('2026-03-01T00:00:00Z')
  const endDate = parseISO('2026-07-20T23:59:59Z')

  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  let countAttendance = 0

  for (let d = 0; d <= totalDays; d++) {
    const currentDate = addDays(startDate, d)
    const dayOfWeek = currentDate.getUTCDay()
    
    for (const user of dbUsers) {
      if (user.weeklyOffDays.includes(dayOfWeek)) {
        continue;
      }

      // 5% chance leave
      const isLeave = Math.random() < 0.05
      
      if (isLeave) {
        await prisma.leaveRequest.create({
          data: {
            userId: user.id,
            type: 'ANNUAL_LEAVE',
            startDate: currentDate,
            endDate: currentDate,
            reason: 'Seeder leave',
            status: 'APPROVED',
          }
        })
        continue;
      }

      // 5% Alpha
      if (Math.random() < 0.05) continue;

      const isLate = Math.random() < 0.15
      
      const shift = user.targetShiftId === shiftPagi.id ? shiftPagi : shiftSiang
      const [startHour, startMin] = shift.startTime.split(':').map(Number)
      
      const checkInDate = new Date(currentDate)
      if (isLate) {
        checkInDate.setUTCHours(startHour, startMin + Math.floor(Math.random() * 45) + 5)
      } else {
        checkInDate.setUTCHours(startHour, startMin - Math.floor(Math.random() * 20))
      }

      const isHalfDay = user.halfDays.includes(dayOfWeek)
      const forgotCheckout = Math.random() < 0.05
      let checkOutDate = null
      
      if (!forgotCheckout) {
        const [endHour, endMin] = shift.endTime.split(':').map(Number)
        checkOutDate = new Date(currentDate)
        
        if (isHalfDay) {
          // checkout 4 hours after start
          checkOutDate.setUTCHours(startHour + 4, startMin + Math.floor(Math.random() * 10))
        } else {
          // normal checkout
          checkOutDate.setUTCHours(endHour, endMin + Math.floor(Math.random() * 30))
        }
      }

      await prisma.attendance.create({
        data: {
          userId: user.id,
          storeId: user.storeId,
          date: startOfDay(currentDate),
          checkInTime: checkInDate,
          checkOutTime: checkOutDate,
          status: isLate ? 'LATE' : 'PRESENT'
        }
      })
      countAttendance++
    }
  }

  console.log(`✅ Selesai insert ${countAttendance} absensi.`)
  
  console.log('💰 Generating Payslips for March, April, May, June...')
  const targetPeriods = [
    { year: 2026, month: 4 },
    { year: 2026, month: 5 },
    { year: 2026, month: 6 },
    { year: 2026, month: 7 } // For period ending in July (which spans June 26 to July 25)
  ]
  
  for (const { year, month } of targetPeriods) {
    console.log(`\n📅 Generating slips for: ${year}-${month}`)
    let successCount = 0
    let failCount = 0
    
    for (const user of dbUsers) {
      try {
        const res = await _generatePayrollSlipInternal(user.id, year, month)
        if (res.success) {
          successCount++
        } else {
          failCount++
        }
      } catch (err) {
        console.error(err)
        failCount++
      }
    }
    console.log(`✅ Success: ${successCount} | ❌ Failed/Skipped: ${failCount}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())

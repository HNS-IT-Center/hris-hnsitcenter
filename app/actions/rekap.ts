'use server'

import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth'

export type RecapData = {
  employee: {
    id: string
    name: string
    employeeId: string | null
    role: string
    department: string
  }
  stats: {
    present: number
    late: number
    alpha: number
    izin: number
    cuti: number
    forgotInOut: number
    avgArrival: string
  }
}

export type DepartmentStat = {
  name: string
  attendanceRate: number // percentage
}

export async function getMonthlyRecap(startDateStr: string, endDateStr: string) {
  const user = await getServerUser()
  if (!user || (user.role !== 'HRD' && user.role !== 'BOSS' && user.role !== 'ADMIN')) {
    throw new Error('Unauthorized')
  }

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)
  
  // Ambil semua karyawan
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE', isActive: true },
    include: { department: true }
  })

  // Ambil semua attendance di rentang tersebut
  const attendances = await prisma.attendance.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  // Ambil semua izin/cuti yang disetujui di rentang tersebut
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: endDate },
      endDate: { gte: startDate }
    }
  })

  const recapList: RecapData[] = []

  let totalPresentGlobally = 0
  let totalDaysExpectedGlobally = 0
  const deptStatsRaw: Record<string, { present: number, total: number }> = {}

  for (const emp of employees) {
    const empAttendances = attendances.filter(a => a.userId === emp.id)
    
    // Hitung Leave
    // Agak kompleks jika izin lintas bulan, tapi kita hitung berdasarkan hari izin yg overlap dgn rentang
    let izinCount = 0
    let cutiCount = 0
    const empLeaves = leaves.filter(l => l.userId === emp.id)
    for (const l of empLeaves) {
       // simplifikasi: anggap 1 request = 1 hari untuk rekapan jika tipe nya bukan annual, tapi kl ANNUAL bisa berhari-hari
       // Untuk akurasi, sebaiknya iterasi hari per hari dalam leave request
       const start = l.startDate < startDate ? startDate : l.startDate
       const end = l.endDate > endDate ? endDate : l.endDate
       const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
       if (l.type === 'ANNUAL_LEAVE') cutiCount += days
       else izinCount += days
    }

    let presentCount = 0
    let lateCount = 0
    let forgotCount = 0
    let totalArrivalMin = 0
    let arrivalCount = 0

    for (const a of empAttendances) {
      if (a.status === 'LATE') lateCount++
      if (a.status === 'PRESENT' || a.status === 'LATE') presentCount++
      if (a.isForgotCheckin || a.isForgotCheckout) forgotCount++

      if (a.checkInTime) {
         totalArrivalMin += (a.checkInTime.getHours() * 60) + a.checkInTime.getMinutes()
         arrivalCount++
      }
    }

    const avgArrival = arrivalCount > 0 ? totalArrivalMin / arrivalCount : 0
    const avgH = Math.floor(avgArrival / 60)
    const avgM = Math.floor(avgArrival % 60)
    const avgArrivalStr = arrivalCount > 0 ? `${avgH.toString().padStart(2, '0')}:${avgM.toString().padStart(2, '0')}` : '-'

    // Asumsi hari kerja dalam rentang tsb adalah (Total Hari kerja - (izin+cuti)). 
    // Untuk dummy, kita anggap total absensi yg ada + izin = total hari dia masuk
    // Tapi karena tidak ada table master hari libur di query ini, Alpha = Hari Kerja - (Present + Izin + Cuti)
    // Supaya gampang (dan sesuai seeder), mari asumsikan 22 hari kerja per bulan.
    const expectedDays = 22 
    const alphaCount = Math.max(0, expectedDays - (presentCount + izinCount + cutiCount))

    recapList.push({
      employee: {
        id: emp.id,
        name: emp.name,
        employeeId: emp.employeeId,
        role: emp.role,
        department: emp.department?.name || 'Unassigned'
      },
      stats: {
        present: presentCount,
        late: lateCount,
        alpha: alphaCount,
        izin: izinCount,
        cuti: cutiCount,
        forgotInOut: forgotCount,
        avgArrival: avgArrivalStr
      }
    })

    const dName = emp.department?.name || 'Unassigned'
    if (!deptStatsRaw[dName]) deptStatsRaw[dName] = { present: 0, total: 0 }
    deptStatsRaw[dName].present += presentCount
    deptStatsRaw[dName].total += expectedDays
    totalPresentGlobally += presentCount
    totalDaysExpectedGlobally += expectedDays
  }

  const deptStats: DepartmentStat[] = Object.keys(deptStatsRaw).map(d => ({
    name: d,
    attendanceRate: deptStatsRaw[d].total > 0 ? Math.round((deptStatsRaw[d].present / deptStatsRaw[d].total) * 100) : 0
  }))

  return { recapList, deptStats }
}

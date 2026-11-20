'use server'

import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth'
import { countScheduledWorkDays, getScheduleForRange } from '@/lib/schedule'
import { dateKeyToStoredDay, wibDateKey } from '@/lib/utils/date'

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

export async function getMonthlyRecap(startDateStr: string, endDateStr: string, departmentFilter?: string, storeFilter?: string) {
  const user = await getServerUser()
  if (!user || (user.role !== 'HRD' && user.role !== 'BOSS' && user.role !== 'ADMIN')) {
    throw new Error('Unauthorized')
  }

  // WIB days of the range; attendance dates are stored as midnight UTC.
  const fromKey = wibDateKey(new Date(startDateStr))
  const toKey = wibDateKey(new Date(endDateStr))

  // Ambil semua karyawan (termasuk HRD, dll kecuali BOSS)
  const employees = await prisma.user.findMany({
    where: { 
      role: { not: 'BOSS' },
      isActive: true,
      ...(departmentFilter ? { departmentName: departmentFilter } : {}),
      ...(storeFilter ? { store: { name: storeFilter } } : {})
    },
    include: { department: true, store: true }
  })

  // Ambil semua attendance di rentang tersebut
  const attendances = await prisma.attendance.findMany({
    where: {
      userId: { in: employees.map((e) => e.id) },
      date: {
        gte: dateKeyToStoredDay(fromKey),
        lte: dateKeyToStoredDay(toKey)
      }
    }
  })

  // Jadwal per hari dari resolver (libur, cuti, rotasi, override) untuk semua karyawan sekaligus.
  // Hari kerja di sini sama dengan scheduledWorkDays di slip gaji.
  const schedules = await getScheduleForRange(employees.map((e) => e.id), fromKey, toKey)

  const recapList: RecapData[] = []

  let totalPresentGlobally = 0
  let totalDaysExpectedGlobally = 0
  const deptStatsRaw: Record<string, { present: number, total: number }> = {}

  for (const emp of employees) {
    const empAttendances = attendances.filter(a => a.userId === emp.id)
    
    // Hari cuti/izin = hari kerja yang tertutup izin yang disetujui (libur dan hari off tidak dihitung)
    const days = [...(schedules.get(emp.id)?.values() ?? [])]
    let izinCount = 0
    let cutiCount = 0
    for (const d of days) {
      if (d.status !== 'LEAVE') continue
      if (d.leave?.type === 'ANNUAL_LEAVE') cutiCount++
      else izinCount++
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

    // Hari kerja terjadwal dari resolver (termasuk hari cuti), sama dengan slip gaji.
    const expectedDays = countScheduledWorkDays(days)
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

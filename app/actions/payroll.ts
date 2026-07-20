'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { getServerUser } from '@/lib/auth'
import { getPayrollPeriodByMonth } from '@/lib/utils/date'

// ============================================================
// TYPES
// ============================================================

export type PayrollConfigInput = {
  baseSalary26Days: number
  uangMakan: number
  transport: number
  bpjs: number
  pph21: number
}

// ============================================================
// AUTH GUARD HELPER
// ============================================================

async function requireHrdOrBoss() {
  const ssoUser = await getServerUser()
  if (!ssoUser) return null
  const admin = await prisma.user.findUnique({ where: { email: ssoUser.email } })
  if (!admin || (admin.role !== 'HRD' && admin.role !== 'BOSS' && admin.role !== 'ADMIN')) return null
  return admin
}

// ============================================================
// WORKING DAY CALCULATOR
// ============================================================

/**
 * Counts the number of working (scheduled) days in a 26th–25th period for a specific user.
 *
 * Rules:
 * - Skips days matching user.weeklyOffDays (e.g. Sunday=0, Saturday=6)
 * - Skips days that are HolidayMarkers applying to "all" OR to this specific user
 * - Half-days are counted as FULL days (they are scheduled workdays)
 */
export async function calculateWorkingDays(userId: string, periodStart: Date, periodEnd: Date) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { weeklyOffDays: true, halfDays: true }
  })
  if (!user) return 0

  // Fetch all holidays in this range
  const holidays = await prisma.holidayMarker.findMany({
    where: { date: { gte: periodStart, lte: periodEnd } },
    include: { assignments: true }
  })

  const holidayDates = new Set<string>()
  for (const h of holidays) {
    const isForAll = h.assignments.length === 0 || h.assignments.some(a => a.applyToAll)
    const isForUser = h.assignments.some(a => a.userId === userId)
    if (isForAll || isForUser) {
      holidayDates.add(h.date.toISOString().slice(0, 10))
    }
  }

  let count = 0
  const current = new Date(periodStart)
  while (current <= periodEnd) {
    const dayOfWeek = current.getUTCDay() // 0=Sun…6=Sat
    const dateStr = current.toISOString().slice(0, 10)
    const isOffDay = user.weeklyOffDays.includes(dayOfWeek)
    const isHoliday = holidayDates.has(dateStr)
    if (!isOffDay && !isHoliday) {
      count++
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return count
}

// ============================================================
// PAYROLL CONFIG (per-employee)
// ============================================================

/**
 * Saves/updates salary config for an employee.
 * AUTO-GENERATES a draft payslip for the current period immediately.
 * The generated slip is isPublished=false until HRD publishes.
 */
export async function upsertPayrollConfig(userId: string, config: PayrollConfigInput, targetYear?: number, targetMonth?: number) {
  const admin = await requireHrdOrBoss()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  await prisma.userPayrollConfig.upsert({
    where: { userId },
    update: { ...config, updatedAt: new Date() },
    create: { userId, ...config }
  })

  // Auto-generate draft slip for the requested payroll period
  const now = new Date()
  const year = targetYear ?? now.getFullYear()
  const month = targetMonth ?? (now.getMonth() + 1)
  await _generatePayrollSlipInternal(userId, year, month, config)

  revalidatePath('/hrd/payroll')
  return { success: true }
}

export async function getPayrollConfig(userId: string) {
  return prisma.userPayrollConfig.findUnique({ where: { userId } })
}

// ============================================================
// INTERNAL SLIP CALCULATOR (no auth check — called internally)
// ============================================================

export async function _generatePayrollSlipInternal(
  userId: string,
  year: number,
  month: number,
  overrides?: Partial<PayrollConfigInput> & { notes?: string }
) {
  // 1. Determine period
  const { periodStart, periodEnd } = getPayrollPeriodByMonth(year, month)

  // 2. Fetch employee
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      shift: true,
      payrollConfig: true,
    }
  })
  if (!user) return { success: false, error: 'Karyawan tidak ditemukan.' }

  // 3. Resolve config (overrides take priority, then stored config, then defaults)
  const cfg = user.payrollConfig
  const baseSalary26Days = overrides?.baseSalary26Days ?? cfg?.baseSalary26Days ?? 0
  const uangMakan        = overrides?.uangMakan        ?? cfg?.uangMakan        ?? 0
  const transport        = overrides?.transport        ?? cfg?.transport        ?? 0
  const bpjs             = overrides?.bpjs             ?? cfg?.bpjs             ?? 0
  const pph21            = overrides?.pph21            ?? cfg?.pph21            ?? 0

  if (baseSalary26Days === 0) {
    // No salary configured — skip silently
    return { success: true, skipped: true }
  }

  // 4. Calculate daily & hourly rates
  const dailyRate = Math.round(baseSalary26Days / 26)

  // Shift hours (e.g. 09:00–17:00 = 8 hours). Fallback to 8 if no shift.
  let shiftHours = 8
  if (user.shift) {
    const [sh, sm] = user.shift.startTime.split(':').map(Number)
    const [eh, em] = user.shift.endTime.split(':').map(Number)
    const startMins = sh * 60 + sm
    let endMins = eh * 60 + em
    if (endMins <= startMins) endMins += 24 * 60 // overnight shift
    shiftHours = (endMins - startMins) / 60
  }
  const hourlyRate = shiftHours > 0 ? Math.round(dailyRate / shiftHours) : 0

  // 5. Count working days
  const scheduledWorkDays = await calculateWorkingDays(userId, periodStart, periodEnd)

  // 6. Base monthly salary adjusted for actual working days
  const adjustedBaseSalary = Math.round(baseSalary26Days + (scheduledWorkDays - 26) * dailyRate)

  // 7. Fetch all attendance records in the period
  const attendances = await prisma.attendance.findMany({
    where: {
      userId,
      date: { gte: periodStart, lte: periodEnd }
    }
  })

  // 8. Fetch approved leave requests in the period
  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart }
    }
  })

  // 9. Fetch approved overtime in the period
  const overtimeRequests = await prisma.overtimeRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      overtimeDate: { gte: periodStart, lte: periodEnd }
    }
  })

  // 10. Tally attendance summary
  let kehadiran = 0, ketidakhadiran = 0, cuti = 0, izin = 0, sakit = 0
  let terlambat = 0, lupaAbsen = 0, izinSetengahHari = 0

  const attendanceMap = new Map(attendances.map(a => [a.date.toISOString().slice(0, 10), a]))

  // Walk through each scheduled working day
  const current = new Date(periodStart)
  while (current <= periodEnd) {
    const dayOfWeek = current.getUTCDay()
    const dateStr = current.toISOString().slice(0, 10)
    const isOffDay = user.weeklyOffDays.includes(dayOfWeek)

    if (!isOffDay) {
      const att = attendanceMap.get(dateStr)

      if (!att) {
        // No record at all for a scheduled workday = Tidak Absen
        ketidakhadiran++
      } else {
        switch (att.status) {
          case 'PRESENT':
            kehadiran++
            break
          case 'LATE':
            kehadiran++
            terlambat++
            break
          case 'FORGOT_CHECKIN':
          case 'FORGOT_CHECKOUT':
            kehadiran++ // Partially counted
            lupaAbsen++
            break
          case 'TIDAK_ABSEN':
          case 'ALPHA':
            ketidakhadiran++
            break
          case 'ON_LEAVE':
            // Cross-reference with leave requests to determine type
            break
          case 'HOLIDAY':
            break
        }
      }
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }

  // Tally leave types
  for (const leave of leaveRequests) {
    const ls = leave.startDate > periodStart ? leave.startDate : periodStart
    const le = leave.endDate < periodEnd ? leave.endDate : periodEnd
    const days = Math.round((le.getTime() - ls.getTime()) / (1000 * 60 * 60 * 24)) + 1

    if (leave.type === 'ANNUAL_LEAVE') {
      cuti += days
    } else if (leave.type === 'SICK') {
      sakit += days
    } else if (leave.type === 'PERSONAL') {
      izin += days
    } else if (leave.type === 'HALF_DAY') {
      izinSetengahHari += days
    }
  }

  // 11. Calculate deductions
  const unpaidDays = ketidakhadiran + izin
  const unpaidSickDays = leaveRequests
    .filter(l => l.type === 'SICK' && !l.isPaid)
    .reduce((acc, l) => {
      const ls = l.startDate > periodStart ? l.startDate : periodStart
      const le = l.endDate < periodEnd ? l.endDate : periodEnd
      return acc + Math.round((le.getTime() - ls.getTime()) / (1000 * 60 * 60 * 24)) + 1
    }, 0)

  const potonganIzin = (unpaidDays + unpaidSickDays) * dailyRate

  // Flat 20,000 deductions per late/forgot incident
  const flatPenalties = (terlambat + lupaAbsen) * 20000

  // Half-day permission deductions
  let potonganHalfDay = 0
  for (const leave of leaveRequests) {
    if (leave.type === 'HALF_DAY' && leave.unpaidHours && leave.unpaidHours > 0) {
      potonganHalfDay += leave.unpaidHours * hourlyRate
    }
  }

  const potonganTerlambat = flatPenalties + potonganHalfDay

  // 12. Calculate overtime pay
  let lemburHours = 0
  for (const ot of overtimeRequests) {
    if (ot.totalHours) lemburHours += ot.totalHours
  }
  const lembur = Math.round(lemburHours * hourlyRate)

  // 13. Assemble pendapatan
  // Gaji Pokok is strictly 75% of the static baseSalary26Days.
  const gajiPokok = Math.round(baseSalary26Days * 0.75)
  // Tunjangan lainnya acts as the buffer that absorbs the calendar scaling (25/27 days)
  const tunjanganLainnya = Math.round(adjustedBaseSalary - gajiPokok - uangMakan - transport)
  const totalPendapatan = gajiPokok + tunjanganLainnya + uangMakan + transport + lembur

  // 14. Assemble potongan
  const totalPotongan = bpjs + pph21 + potonganIzin + potonganTerlambat

  // 15. Net
  const totalPenerimaan = totalPendapatan - totalPotongan

  // 16. Upsert the snapshot.
  // IMPORTANT: regenerating always resets isPublished=false so employees
  // see the old data until HRD explicitly republishes.
  
  const periodSlugName = format(new Date(periodEnd), 'MMM-yyyy').toLowerCase()
  const slug = user.employeeId ? `${user.employeeId}-${periodSlugName}`.toLowerCase() : null
  
  const slip = await prisma.payrollSlip.upsert({
    where: { userId_periodStart: { userId, periodStart } },
    update: {
      slug,
      generatedAt: new Date(),
      periodEnd,
      baseSalary26Days,
      uangMakan,
      transport,
      bpjs,
      pph21,
      scheduledWorkDays,
      dailyRate,
      hourlyRate,
      gajiPokok,
      tunjanganLainnya,
      lembur,
      totalPendapatan,
      potonganIzin,
      potonganTerlambat,
      potonganLainnya: 0,
      totalPotongan,
      totalPenerimaan,
      kehadiran,
      ketidakhadiran,
      cuti,
      izin,
      sakit,
      terlambat,
      lupaAbsen,
      izinSetengahHari,
      notes: overrides?.notes ?? undefined,
      isPublished: false,
    },
    create: {
      userId,
      slug,
      periodStart,
      periodEnd,
      baseSalary26Days,
      uangMakan,
      transport,
      bpjs,
      pph21,
      scheduledWorkDays,
      dailyRate,
      hourlyRate,
      gajiPokok,
      tunjanganLainnya,
      lembur,
      totalPendapatan,
      potonganIzin,
      potonganTerlambat,
      potonganLainnya: 0,
      totalPotongan,
      totalPenerimaan,
      kehadiran,
      ketidakhadiran,
      cuti,
      izin,
      sakit,
      terlambat,
      lupaAbsen,
      izinSetengahHari,
      notes: overrides?.notes ?? null,
      isPublished: false,
    }
  })

  return { success: true, slip }
}

// ============================================================
// GENERATE / REGENERATE PAYROLL SLIP (public, auth-checked)
// ============================================================

export async function generatePayrollSlip(
  userId: string,
  year: number,
  month: number,
  overrides?: Partial<PayrollConfigInput> & { notes?: string }
) {
  const admin = await requireHrdOrBoss()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  const result = await _generatePayrollSlipInternal(userId, year, month, overrides)
  revalidatePath('/hrd/payroll')
  revalidatePath('/profile')
  return result
}

// ============================================================
// READ PAYROLL SLIPS
// ============================================================

/**
 * Returns published payslips for an employee's Profile page.
 * Includes the user relation so the PayslipPrintView can render the full slip.
 */
export async function getEmployeePayrollSlips(userId: string) {
  return prisma.payrollSlip.findMany({
    where: { userId, isPublished: true },
    orderBy: { periodStart: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          positionName: true,
          departmentName: true,
          joinDate: true,
          store: { select: { name: true } },
          department: { select: { name: true } },
        }
      }
    }
  })
}

export async function getPayrollSlip(userId: string, periodStart: Date) {
  return prisma.payrollSlip.findUnique({
    where: { userId_periodStart: { userId, periodStart } },
    include: { user: { select: { name: true, positionName: true, departmentName: true, joinDate: true, store: { select: { name: true } } } } }
  })
}

/**
 * Lists all active employees with their payroll config and current-period slip status.
 */
export async function getAllEmployeesPayrollSummary(year?: number, month?: number) {
  const admin = await requireHrdOrBoss()
  if (!admin) return []

  const now = new Date()
  const y = year ?? now.getFullYear()
  const m = month ?? (now.getMonth() + 1)
  const { periodStart } = getPayrollPeriodByMonth(y, m)

  const employees = await prisma.user.findMany({
    where: { isActive: true, role: { not: 'BOSS' } },
    orderBy: { name: 'asc' },
    include: {
      payrollConfig: true,
      department: { select: { name: true } },
      store: { select: { name: true } },
      shift: { select: { name: true, startTime: true, endTime: true } },
      payrollSlips: {
        where: { periodStart },
        select: { id: true, isPublished: true, generatedAt: true, totalPenerimaan: true }
      }
    }
  })

  return employees.map(emp => ({
    ...emp,
    currentSlip: emp.payrollSlips[0] ?? null,
    payrollSlips: undefined, // don't send the full array
  }))
}

// ============================================================
// BATCH GENERATE PAYROLL SLIPS
// ============================================================

export async function generateAllPayrollSlips(year: number, month: number) {
  const admin = await requireHrdOrBoss()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  const employees = await prisma.user.findMany({
    where: { isActive: true, role: { not: 'BOSS' } },
    select: { id: true }
  })

  if (employees.length === 0) {
    return { success: false, error: 'Tidak ada karyawan aktif.' }
  }

  let successCount = 0
  let failCount = 0

  // Process in chunks of 10 to avoid overwhelming the database connection pool
  const CHUNK_SIZE = 10
  for (let i = 0; i < employees.length; i += CHUNK_SIZE) {
    const chunk = employees.slice(i, i + CHUNK_SIZE)

    const results = await Promise.all(
      chunk.map(emp => _generatePayrollSlipInternal(emp.id, year, month))
    )

    for (const res of results) {
      if (res.success) {
        successCount++
      } else {
        failCount++
      }
    }
  }

  revalidatePath('/hrd/payroll')
  return { success: true, message: `Berhasil men-generate ${successCount} slip gaji.` + (failCount > 0 ? ` Gagal: ${failCount}` : '') }
}

export async function publishAllPayrollSlips(year: number, month: number) {
  const admin = await requireHrdOrBoss()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  const { periodStart } = getPayrollPeriodByMonth(year, month)

  const result = await prisma.payrollSlip.updateMany({
    where: { periodStart },
    data: { isPublished: true }
  })

  revalidatePath('/hrd/payroll')
  revalidatePath('/profile')
  return { success: true, message: `Berhasil mem-publish ${result.count} slip gaji.` }
}

export async function togglePublishPayrollSlip(userId: string, year: number, month: number, isPublished: boolean) {
  const admin = await requireHrdOrBoss()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  const { periodStart } = getPayrollPeriodByMonth(year, month)

  try {
    await prisma.payrollSlip.update({
      where: { userId_periodStart: { userId, periodStart } },
      data: { isPublished }
    })
    revalidatePath('/hrd/payroll')
    revalidatePath('/profile')
    return { success: true, message: isPublished ? 'Slip berhasil di-publish.' : 'Publish slip dibatalkan.' }
  } catch (error) {
    return { success: false, error: 'Slip belum digenerate.' }
  }
}

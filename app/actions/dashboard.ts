'use server'

import { prisma } from '@/lib/prisma'
import { requirePrivileged, requireSelfOrPrivileged } from '@/lib/auth/guards'
import { dateKeyToStoredDay, getPayrollPeriod, todayUTC, wibDateKey } from '@/lib/utils/date'
import { getScheduleForRange } from '@/lib/schedule'

// ─── Employee Dashboard ────────────────────────────────────────────────────────

/**
 * Fetches all data needed for the Employee Dashboard in a single efficient call.
 */
export async function getEmployeeDashboardData(userId: string) {
  await requireSelfOrPrivileged(userId)
  const now = new Date()
  const { startDateUTC, endDateUTC, periodLabel } = getPayrollPeriod(now)

  const today = todayUTC()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      leaveQuotaRemaining: true,
      departmentId: true,
      storeId: true,
      shiftId: true,
      shift: { select: { name: true, startTime: true, endTime: true } },
      store: { select: { name: true } },
      department: { select: { name: true } },
      positionName: true,
    },
  })

  const [monthlyAttendance, recentLeaves, recentBroadcasts, todayRecord] =
    await Promise.all([
      prisma.attendance.findMany({
        where: {
          userId,
          date: { gte: startDateUTC, lte: endDateUTC },
        },
        select: { status: true },
      }),

      prisma.leaveRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),

      prisma.broadcast.findMany({
        where: {
          OR: [
            // No filters (all employees)
            {
              filterDepts: { none: {} },
              filterStores: { none: {} },
              filterShifts: { none: {} },
              filterUsers: { none: {} },
            },
            // Or matches user's department
            ...(user?.departmentId ? [{ filterDepts: { some: { departmentId: user.departmentId } } }] : []),
            // Or matches user's store
            ...(user?.storeId ? [{ filterStores: { some: { storeId: user.storeId } } }] : []),
            // Or matches user's shift
            ...(user?.shiftId ? [{ filterShifts: { some: { shiftId: user.shiftId } } }] : []),
            // Or matches user directly
            { filterUsers: { some: { userId } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          title: true,
          message: true,
          tag: true,
          createdAt: true,
        },
      }),

      prisma.attendance.findFirst({
        where: { userId, date: today },
      }),
    ])

  // Tally up monthly attendance
  const summary = {
    hadir: 0,
    telat: 0,
    alpha: 0,
    izin: 0,
    cuti: 0,
  }
  for (const a of monthlyAttendance) {
    if (a.status === 'PRESENT') summary.hadir++
    else if (a.status === 'LATE') summary.telat++
    else if (a.status === 'ALPHA') summary.alpha++
    else if (a.status === 'ON_LEAVE') {
      // Check if it's a sick/personal or annual leave — can't distinguish here
      // For now count all as izin; real impl would join LeaveRequest
      summary.izin++
    }
  }

  const quota = {
    total: 12,
    remaining: user?.leaveQuotaRemaining ?? 0,
    used: 12 - (user?.leaveQuotaRemaining ?? 0),
  }

  return {
    user,
    summary,
    quota,
    recentLeaves,
    recentBroadcasts,
    todayRecord,
  }
}

// ─── HRD Dashboard ─────────────────────────────────────────────────────────────

/**
 * Fetches all data needed for the HRD Dashboard.
 */
export async function getHrdDashboardData(dateStr?: string) {
  await requirePrivileged()
  const target = dateStr ? new Date(dateStr) : new Date()
  const day = new Date(Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()))

  const [
    totalActive,
    dayAttendances,
    pendingLeaveCount,
    pendingOvertimeCount,
    unresolvedFlags,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true, role: 'EMPLOYEE' } }),

    prisma.attendance.findMany({
      where: { date: day },
      select: { status: true, checkInTime: true, checkOutTime: true },
    }),

    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    
    prisma.overtimeRequest.count({ where: { status: 'PENDING' } }),

    prisma.attentionFlag.findMany({
      where: { isResolved: false },
      include: {
        user: { select: { name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const present = dayAttendances.filter(
    (a) => a.status === 'PRESENT' || a.status === 'LATE'
  ).length
  const late = dayAttendances.filter((a) => a.status === 'LATE').length
  // "Missing" = active employees who have no check-in record yet today
  const missing = Math.max(0, totalActive - present)

  return {
    totalActive,
    present,
    late,
    missing,
    pendingLeaveCount: pendingLeaveCount + pendingOvertimeCount,
    unresolvedFlags,
    selectedDate: day.toISOString(),
  }
}

// ─── HRD Attendance Logs ───────────────────────────────────────────────────────

/**
 * Fetches the full employee roster with their attendance status for a given date.
 * Status of employees without a record comes from the schedule resolver (lib/schedule):
 * - approved full-day leave = "ON_LEAVE"
 * - holiday, weekly day off or roster day off = "HOLIDAY" (shown as "Libur")
 * - today, scheduled to work = "BELUM_ABSEN"; past date = "TIDAK_ABSEN"
 */
export async function getHrdAttendanceLogs(dateStr?: string) {
  await requirePrivileged()
  // WIB day of the requested date (or today), stored as midnight UTC.
  const dayKey = wibDateKey(dateStr ? new Date(dateStr) : new Date())
  const day = dateKeyToStoredDay(dayKey)
  const isPastDate = dayKey < wibDateKey(new Date())

  const [employees, attendances] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        positionName: true,
        departmentName: true,
        weeklyOffDays: true,
        store: { select: { id: true, name: true, latitude: true, longitude: true } },
        shift: { select: { name: true, startTime: true, endTime: true } },
      },
      orderBy: { name: 'asc' },
    }),

    prisma.attendance.findMany({
      where: { date: day },
      select: {
        id: true,
        userId: true,
        status: true,
        checkInTime: true,
        checkOutTime: true,
        checkInDistance: true,
        lateMinutes: true,
        checkInPhotoUrl: true,
        checkOutPhotoUrl: true,
        checkInLat: true,
        checkInLng: true,
        checkOutLat: true,
        checkOutLng: true,
        isOverridden: true,
        overrideReason: true,
      },
    }),
  ])

  const schedules = await getScheduleForRange(employees.map((e) => e.id), dayKey, dayKey)
  const attendanceMap = new Map(attendances.map((a) => [a.userId, a]))

  // Merge: every employee gets an attendance record or null
  const logs = employees.map((emp) => {
    const record = attendanceMap.get(emp.id) ?? null
    const schedule = schedules.get(emp.id)?.get(dayKey) ?? null
    const isOffDay = schedule?.status === 'HOLIDAY' || schedule?.status === 'OFF'

    let displayStatus = 'BELUM_ABSEN' as string
    if (record) {
      displayStatus = record.status
    } else if (schedule?.status === 'LEAVE') {
      displayStatus = 'ON_LEAVE'
    } else if (isOffDay) {
      displayStatus = 'HOLIDAY' // Not required to come in
    } else if (isPastDate) {
      // Past date + no record + was scheduled to work = Tidak Absen
      displayStatus = 'TIDAK_ABSEN'
    }
    // else: today, not yet checked in = BELUM_ABSEN (default)

    // Show the shift of that day (rotation or roster), not only the primary shift.
    const dayShift = schedule?.shift
      ? { name: schedule.shift.name, startTime: schedule.startTime ?? schedule.shift.startTime, endTime: schedule.endTime ?? schedule.shift.endTime }
      : emp.shift

    return {
      employee: { ...emp, shift: dayShift },
      attendance: record,
      leave: schedule?.leave ?? null,
      holidayName: schedule?.holiday?.name ?? null,
      displayStatus,
      isPastDate,
      isOffDay,
      // Pass the date string for empty-record overrides
      dateStr: dayKey,
    }
  })

  return { logs, date: day.toISOString() }
}

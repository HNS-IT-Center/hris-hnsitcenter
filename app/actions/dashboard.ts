'use server'

import { prisma } from '@/lib/prisma'
import { getPayrollPeriod, todayUTC } from '@/lib/utils/date'

// ─── Employee Dashboard ────────────────────────────────────────────────────────

/**
 * Fetches all data needed for the Employee Dashboard in a single efficient call.
 */
export async function getEmployeeDashboardData(userId: string) {
  const now = new Date()
  const { startDateUTC, endDateUTC, periodLabel } = getPayrollPeriod(now)

  const today = todayUTC()

  const [user, monthlyAttendance, recentLeaves, recentBroadcasts, todayRecord] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          leaveQuotaRemaining: true,
          shift: { select: { name: true, startTime: true, endTime: true } },
          store: { select: { name: true } },
          department: { select: { name: true } },
          positionName: true,
        },
      }),

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
  const target = dateStr ? new Date(dateStr) : new Date()
  const day = new Date(Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()))

  const [
    totalActive,
    dayAttendances,
    pendingLeaveCount,
    unresolvedFlags,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true, role: 'EMPLOYEE' } }),

    prisma.attendance.findMany({
      where: { date: day },
      select: { status: true, checkInTime: true, checkOutTime: true },
    }),

    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),

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
    pendingLeaveCount,
    unresolvedFlags,
    selectedDate: day.toISOString(),
  }
}

// ─── HRD Attendance Logs ───────────────────────────────────────────────────────

/**
 * Fetches the full employee roster with their attendance status for a given date.
 * Employees with no attendance record are included as "BELUM_ABSEN".
 */
export async function getHrdAttendanceLogs(dateStr?: string) {
  // Parse the target date
  const target = dateStr ? new Date(dateStr) : new Date()
  const day = new Date(
    Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  )

  const [employees, attendances, leaves] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        positionName: true,
        departmentName: true,
        store: { select: { name: true } },
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

    prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: day },
        endDate: { gte: day }
      }
    })
  ])

  // Build lookup maps
  const attendanceMap = new Map(attendances.map((a) => [a.userId, a]))
  const leaveMap = new Map(leaves.map((l) => [l.userId, l]))

  // Merge: every employee gets an attendance record or null
  const logs = employees.map((emp) => {
    const record = attendanceMap.get(emp.id) ?? null
    const leave = leaveMap.get(emp.id) ?? null

    let displayStatus = 'BELUM_ABSEN' as string

    if (record) {
      displayStatus = record.status
    } else if (leave) {
      displayStatus = 'ON_LEAVE'
    }

    return {
      employee: emp,
      attendance: record,
      leave: leave,
      displayStatus,
    }
  })

  return { logs, date: day.toISOString() }
}

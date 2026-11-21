import 'server-only'

import { prisma } from '@/lib/prisma'
import { wibDateKey } from '@/lib/utils/date'
import {
  annualLeaveQuota,
  leaveTypeRules,
  pickAttendanceRules,
  type AttendancePolicyRow,
  type LeaveTypeRules,
  type ResolvedAttendanceRules,
} from './resolve'

export * from './resolve'

/**
 * Every attendance policy row. The table holds a handful of rows (one per
 * change per store), so callers that need many days load it once and pick
 * per day with pickAttendanceRules().
 */
export async function getAttendancePolicyRows(): Promise<AttendancePolicyRow[]> {
  return prisma.attendancePolicy.findMany({
    select: {
      id: true,
      storeId: true,
      effectiveFrom: true,
      lateToleranceMin: true,
      checkoutGraceMin: true,
      rainyGraceMin: true,
      latePenalty: true,
      forgotPenalty: true,
    },
  })
}

/** Attendance rules for a store on a WIB day (default: today). */
export async function getAttendanceRules(
  storeId: string | null | undefined,
  day: Date | string = new Date(),
): Promise<ResolvedAttendanceRules> {
  const key = typeof day === 'string' ? day.slice(0, 10) : wibDateKey(day)
  return pickAttendanceRules(await getAttendancePolicyRows(), storeId, key)
}

export async function getLeaveTypeRows(): Promise<LeaveTypeRules[]> {
  return prisma.leaveTypeConfig.findMany({
    select: {
      code: true,
      name: true,
      requiresAttachment: true,
      attachmentDays: true,
      isPaid: true,
      paidOnlyWithAttachment: true,
      deductsQuota: true,
      annualQuotaDays: true,
      maxDaysPerRequest: true,
      minNoticeDays: true,
      allowHalfDay: true,
      isActive: true,
    },
  })
}

export async function getLeaveTypeRules(code: string): Promise<LeaveTypeRules> {
  return leaveTypeRules(await getLeaveTypeRows(), code)
}

/** Annual leave days per work year, from the leave type that deducts quota. */
export async function getAnnualLeaveQuota(): Promise<number> {
  return annualLeaveQuota(await getLeaveTypeRows())
}

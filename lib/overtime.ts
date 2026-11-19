import 'server-only'

import { prisma } from '@/lib/prisma'

/**
 * Overtime pay rules (OvertimeSetting, edited by HRD on /hrd/lembur).
 *
 * Each approved overtime request is rounded on its own: full hours count, and
 * the leftover minutes count as one more hour when they reach the threshold.
 * With the default 45: 45 m -> 1 h, 1 h 30 m -> 1 h, 1 h 50 m -> 2 h.
 */

export const DEFAULT_ROUNDING_THRESHOLD_MINUTES = 45
export const DEFAULT_OVERTIME_HOURLY_RATE = 20000

export interface OvertimeRules {
  roundingThresholdMinutes: number
  defaultHourlyRate: number
}

export async function getOvertimeRules(): Promise<OvertimeRules> {
  const row = await prisma.overtimeSetting.findUnique({ where: { id: 'default' } })
  return {
    roundingThresholdMinutes: row?.roundingThresholdMinutes ?? DEFAULT_ROUNDING_THRESHOLD_MINUTES,
    defaultHourlyRate: row?.defaultHourlyRate ?? DEFAULT_OVERTIME_HOURLY_RATE,
  }
}

/** Billable hours for one overtime session of `minutes` minutes. */
export function billableOvertimeHours(minutes: number, thresholdMinutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0
  const whole = Math.floor(minutes / 60)
  const rest = Math.round(minutes - whole * 60)
  return whole + (rest >= thresholdMinutes ? 1 : 0)
}

/** "1 jam 50 menit" */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} menit`
  return m === 0 ? `${h} jam` : `${h} jam ${m} menit`
}

/**
 * Minutes actually worked for an overtime request. When the employee checked
 * out more than 15 minutes before the planned end, the check-out time is used.
 */
export function workedOvertimeMinutes(
  ot: { startTime: Date; endTime: Date | null; totalHours: number | null },
  checkOutTime: Date | null | undefined,
): number {
  const plannedMinutes = ot.endTime
    ? (ot.endTime.getTime() - ot.startTime.getTime()) / 60000
    : (ot.totalHours ?? 0) * 60
  if (!ot.endTime || !checkOutTime) return Math.max(0, plannedMinutes)

  const earlyMs = ot.endTime.getTime() - checkOutTime.getTime()
  if (earlyMs > 15 * 60000) {
    return Math.max(0, (checkOutTime.getTime() - ot.startTime.getTime()) / 60000)
  }
  return Math.max(0, plannedMinutes)
}

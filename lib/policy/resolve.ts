/**
 * Attendance settings (Pusat Pengaturan Absensi): the rules HRD edits instead
 * of numbers in code. Pure (no database) so it can be unit tested;
 * lib/policy/index.ts loads the rows.
 *
 * The DEFAULT_* values are the starting values: the numbers the code used
 * before Sprint 2, also written by prisma/sql/2026-11-21-pengaturan-absensi.sql.
 * They only apply when the tables are empty.
 */
import { wibDateKey } from '@/lib/utils/date'

export type AttendanceRules = {
  lateToleranceMin: number
  checkoutGraceMin: number
  rainyGraceMin: number
  latePenalty: number
  forgotPenalty: number
}

export const DEFAULT_ATTENDANCE_RULES: Readonly<AttendanceRules> = Object.freeze({
  lateToleranceMin: 0,
  checkoutGraceMin: 55,
  rainyGraceMin: 60,
  latePenalty: 20000,
  forgotPenalty: 20000,
})

export type AttendancePolicyRow = AttendanceRules & {
  id: string
  storeId: string | null
  effectiveFrom: Date // @db.Date, WIB day
}

export type ResolvedAttendanceRules = AttendanceRules & {
  /** Which row decided: a store row, the global row, or the built-in defaults. */
  source: 'STORE' | 'GLOBAL' | 'DEFAULT'
  policyId: string | null
  effectiveFrom: string | null // YYYY-MM-DD
}

function latest(rows: readonly AttendancePolicyRow[]): AttendancePolicyRow | null {
  let best: AttendancePolicyRow | null = null
  for (const r of rows) if (!best || r.effectiveFrom > best.effectiveFrom) best = r
  return best
}

/**
 * Rules for a store on a WIB day: the newest store row in effect, else the
 * newest global row in effect, else the defaults. A row is in effect from its
 * effectiveFrom day on, so a change dated in the future does nothing today.
 */
export function pickAttendanceRules(
  rows: readonly AttendancePolicyRow[],
  storeId: string | null | undefined,
  date: string, // YYYY-MM-DD, WIB
): ResolvedAttendanceRules {
  const inEffect = rows.filter((r) => wibDateKey(r.effectiveFrom) <= date)
  const store = storeId ? latest(inEffect.filter((r) => r.storeId === storeId)) : null
  const row = store ?? latest(inEffect.filter((r) => r.storeId === null))
  if (!row) return { ...DEFAULT_ATTENDANCE_RULES, source: 'DEFAULT', policyId: null, effectiveFrom: null }
  return {
    lateToleranceMin: row.lateToleranceMin,
    checkoutGraceMin: row.checkoutGraceMin,
    rainyGraceMin: row.rainyGraceMin,
    latePenalty: row.latePenalty,
    forgotPenalty: row.forgotPenalty,
    source: store ? 'STORE' : 'GLOBAL',
    policyId: row.id,
    effectiveFrom: wibDateKey(row.effectiveFrom),
  }
}

/** A check-in after this instant is late (shift start + tolerance, + rainy grace on a rainy day). */
export function lateThreshold(shiftStart: Date, rules: AttendanceRules, isRainyDay: boolean): Date {
  const graceMin = rules.lateToleranceMin + (isRainyDay ? rules.rainyGraceMin : 0)
  return new Date(shiftStart.getTime() + graceMin * 60000)
}

/** Last instant to check out: shift end (or approved overtime end) + checkout grace. */
export function checkoutDeadline(shiftEnd: Date, overtimeEnd: Date | null, rules: AttendanceRules): Date {
  return new Date((overtimeEnd ?? shiftEnd).getTime() + rules.checkoutGraceMin * 60000)
}

// ------------------------------------------------------------
// Leave types
// ------------------------------------------------------------

export type LeaveTypeRules = {
  code: string
  name: string
  requiresAttachment: boolean
  attachmentDays: number | null
  isPaid: boolean
  paidOnlyWithAttachment: boolean
  deductsQuota: boolean
  annualQuotaDays: number | null
  maxDaysPerRequest: number | null
  minNoticeDays: number
  allowHalfDay: boolean
  isActive: boolean
}

const leaveType = (code: string, name: string, over: Partial<LeaveTypeRules>): LeaveTypeRules => ({
  code,
  name,
  requiresAttachment: false,
  attachmentDays: null,
  isPaid: true,
  paidOnlyWithAttachment: false,
  deductsQuota: false,
  annualQuotaDays: null,
  maxDaysPerRequest: null,
  minNoticeDays: 0,
  allowHalfDay: false,
  isActive: true,
  ...over,
})

export const DEFAULT_LEAVE_TYPES: Readonly<Record<string, LeaveTypeRules>> = Object.freeze({
  ANNUAL_LEAVE: leaveType('ANNUAL_LEAVE', 'Cuti Tahunan', { deductsQuota: true, annualQuotaDays: 12 }),
  SICK: leaveType('SICK', 'Sakit', { requiresAttachment: true, attachmentDays: 3, paidOnlyWithAttachment: true }),
  PERSONAL: leaveType('PERSONAL', 'Izin', { isPaid: false }),
  HALF_DAY: leaveType('HALF_DAY', 'Izin Setengah Hari', { allowHalfDay: true }),
})

/** Rules of one leave type: the stored row, else the default, else a paid type with no limits. */
export function leaveTypeRules(rows: readonly LeaveTypeRules[], code: string): LeaveTypeRules {
  return rows.find((r) => r.code === code) ?? DEFAULT_LEAVE_TYPES[code] ?? leaveType(code, code, {})
}

/** Annual leave days per work year (the type that deducts quota). */
export function annualLeaveQuota(rows: readonly LeaveTypeRules[]): number {
  const quotaType = rows.find((r) => r.deductsQuota && r.annualQuotaDays != null)
  return quotaType?.annualQuotaDays ?? DEFAULT_LEAVE_TYPES.ANNUAL_LEAVE.annualQuotaDays ?? 0
}

/**
 * Whether a full leave day is paid. A type can be unpaid (Izin), or paid only
 * with an attachment, in which case the request's isPaid flag decides (it is
 * false for a sick leave without a doctor's note until HRD verifies one).
 */
export function isLeaveDayPaid(rules: LeaveTypeRules, request: { isPaid: boolean }): boolean {
  if (!rules.isPaid) return false
  if (rules.paidOnlyWithAttachment) return request.isPaid
  return true
}
